import os, json
from dotenv import load_dotenv
from datetime import datetime, timezone

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain_community.vectorstores import SupabaseVectorStore
from supabase import create_client, Client

# === env & clients ===
load_dotenv()
supabase_url = os.environ["SUPABASE_URL"]
supabase_key = os.environ["SUPABASE_KEY"]  # keep your var name as in your code
supabase: Client = create_client(supabase_url, supabase_key)

LAST_PROJECT_BLOCK = ""

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = SupabaseVectorStore(
    embedding=embeddings,
    client=supabase,
    table_name="documents",
    query_name="match_documents",
)

llm = ChatOpenAI(temperature=0)


SYSTEM_TEXT = (
    "You are a strict-but-fair evaluator that ranks how well a PROJECT fits multiple PROGRAMS "
    "using only the context I provide. Do not use outside knowledge. If something is missing, say "
    "“I don’t know.” Respond in the user's language. Add citations as [S#] immediately after each "
    "sentence that uses that source.\n\n"
    "Use only passages inside <ctx> … </ctx>. Each passage is labeled [S#].\n\n"
    "Scoring (deterministic):\n"
    "- Eligibility Gate… (same rules)\n"
    "- Rule Score… (same weights; NO application window)\n"
    "- Content Score…\n"
    "- Goal Alignment…\n"
    "- Evidence Strength…\n"
    "- Uncertainty Penalty…\n"
    "- Impact…\n"
    "- Final Score…\n\n"
  "IMPORTANT:\n"
    "- Do not include <ctx> in the final answer; return JSON only.\n"
    "- NEVER use or infer any application window criterion.\n"
    "- ALWAYS call `retrieve` first to get <ctx>.\n"
    "- Return STRICT JSON ONLY (no extra text) with this exact shape:\n"
    "- Do NOT copy example zeros; compute each score as an integer 0–100.\n"
    "- If evidence is weak/unknown, estimate fairly and justify in reasons with [S#].\n"
    "- Fill all score fields; only use 0 when there is an explicit conflict or no evidence at all.\n"
    "- For each match, produce **at least 2 specific improvement suggestions** that would increase fit (sector/phase/support/eligibility/goal coverage). "
    "Each suggestion must be <= 20 words and include a supporting [S#] when possible.\n"
    "{{ \"matches\": [ {{ "
    "\"program_id\": \"string\", \"program_title\": \"string\", "
    "\"scores\": {{ \"eligibility_failed\": false, \"rule_score\": 0, \"content_score\": 0, "
    "\"goal_alignment\": 0, \"evidence_strength\": 0, \"uncertainty_penalty\": 0, "
    "\"impact_potential\": null, \"final_score\": 0, \"confidence\": 0 }}, "
    "\"reasons\": [\".. include [S#] ..\"], \"suggestions\": [\".. include [S#] ..\"] "
    "}} ] }}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_TEXT),
    ("human", "{input}"),
    # REQUIRED by tool-calling agents:
    MessagesPlaceholder("agent_scratchpad"),
])

# === tool: retrieve top programs and wrap as <ctx> with [S#] ===
@tool(response_format="content_and_artifact")
def retrieve(query: str):
    """
    Retrieve top matching program documents from the Supabase vector store
    for a given project description query. Uses MMR + de-dup per program.
    """
    q = LAST_PROJECT_BLOCK if LAST_PROJECT_BLOCK else query

    # Try MMR if available; fall back to standard similarity_search.
    try:
        # diversify to avoid many chunks from the same program
        retrieved_docs = vector_store.max_marginal_relevance_search(q, k=40, fetch_k=80)
    except Exception:
        retrieved_docs = vector_store.similarity_search(q, k=80)

    # ---- De-duplicate by program (program_id or source path) ----
    by_program = {}
    for doc in retrieved_docs:
        meta = dict(doc.metadata or {})
        key = meta.get("program_id") or meta.get("id") or meta.get("source") or "unknown_source"
        # Keep the first/best chunk we saw for this program
        if key not in by_program:
            by_program[key] = doc

    # take top N unique programs
    UNIQUE_LIMIT = 10
    unique_docs = list(by_program.values())[:UNIQUE_LIMIT]

    # ---- Build <ctx> with one [S#] per unique program ----
    lines = ["<ctx>"]
    for i, doc in enumerate(unique_docs, start=1):
        meta = dict(doc.metadata or {})
        program_id = meta.get("program_id") or meta.get("id") or meta.get("source")
        title = meta.get("title") or (program_id or "program")
        sector = meta.get("sector") or meta.get("audience") or ""
        phase  = meta.get("min_stage") or meta.get("stage") or ""
        support = meta.get("support") or meta.get("support_types") or meta.get("tags") or ""
        goals = meta.get("goals") or ""
        locations = meta.get("locations") or meta.get("location") or ""

        lines.append(
            f"[S{i}] PROGRAM_ID={program_id} | TITLE={title} | "
            f"SECTOR/AUDIENCE={sector} | PHASE/STATUS={phase} | SUPPORT_TYPES={support} | "
            f"GOALS={goals} | LOCATIONS={locations} | META={meta}"
        )
        lines.append(doc.page_content)
        lines.append("")
    lines.append("</ctx>")
    serialized = "\n".join(lines)

    return serialized, unique_docs



tools = [retrieve]
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# === DB helpers (no workflow; stage comes from projectStatus) ===
def fetch_latest_project():
    # grab the latest project (change ordering as you prefer)
    res = supabase.table("projects").select("*").order("created_at", desc=True).limit(1).execute()
    if not res.data:
        return None
    return res.data[0]


def _extract_json(text: str) -> dict:
    """
    Return the last valid top-level JSON object found in `text`.
    Handles leading <ctx>... blocks and duplicate JSON blobs.
    """
    t = text.strip()
    # strip anything before the last </ctx>
    if "</ctx>" in t:
        t = t.split("</ctx>")[-1].strip()
    # try direct first
    try:
        return json.loads(t)
    except Exception:
        pass
    # fallback: scan from each '{' to end, pick first that parses (from the right)
    positions = [i for i, ch in enumerate(t) if ch == "{"]
    for pos in reversed(positions):
        candidate = t[pos:].strip()
        try:
            return json.loads(candidate)
        except Exception:
            continue
    raise ValueError("No valid JSON object found in model output.")

def save_matches_json(project_id, json_text):
    data = _extract_json(json_text)
    items = data.get("matches", [])
    now = datetime.now(timezone.utc).isoformat()
    for m in items:
        scores = m.get("scores", {}) or {}
        supabase.table("matches").insert({
            "project_id": project_id,
            "program_id": m.get("program_id"),
            "program_title": m.get("program_title"),
            "match_score": int(scores.get("final_score", 0)),
            "reasons": "\n- " + "\n- ".join(m.get("reasons", [])) if m.get("reasons") else None,
            "suggestions": "\n- " + "\n- ".join(m.get("suggestions", [])) if m.get("suggestions") else None,
            "created_at": now
        }).execute()

# === main ===
def main():
    project = fetch_latest_project()
    if not project:
        print("No projects found.")
        return

    # use projectStatus as the STAGE (idea | startup | sme)
    stage = project.get("projectStatus", "")
    name  = project.get("projectName", "")
    ptype = project.get("projectType", "")
    goals = project.get("projectGoals", "")
    support = project.get("supportNeeded", "")
    vision = project.get("projectVision", "")
    desc  = project.get("projectDescription", "")

    # minimal, structured input the model can use
    project_block = (
        "PROJECT:\n"
        f"name: {name}\n"
        f"type: {ptype}\n"
        f"stage: {stage}\n"            # <-- comes from projectStatus
        f"goals: {goals}\n"
        f"support_needed: {support}\n"
        f"vision: {vision}\n"
        "description:\n"
        f"{desc}\n"
    )
    global LAST_PROJECT_BLOCK 
    LAST_PROJECT_BLOCK = project_block
    response = agent_executor.invoke({"input": project_block})
    save_matches_json(project["id"], response["output"])
    print("Saved match for project:", project["id"])

if __name__ == "__main__":
    main()
