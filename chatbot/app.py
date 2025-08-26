# FastAPI backend for your RAG chat.
# --------------------------------------------------------
# Run:
#   pip install fastapi uvicorn "langchain-openai>=0.1.0" \
#       langchain-community langchain-text-splitters \
#       supabase supabase-py python-dotenv selenium webdriver-manager
#   uvicorn main:app --reload --port 8000
#
# Env (.env):
#   OPENAI_API_KEY=sk-*****
#   SUPABASE_URL=...
#   SUPABASE_SERVICE_KEY=...
#   OPENAI_CHAT_MODEL=gpt-4o-mini
#   OPENAI_EMBED_MODEL=text-embedding-3-small
# --------------------------------------------------------

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# LangChain / OpenAI
from langchain_community.document_loaders import SeleniumURLLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore

# Supabase
from supabase import create_client, Client

# ----------------------
# Logging & app
# ----------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag-backend")

app = FastAPI(title="RAG Chat Backend", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# Globals (simple in-memory state per match_result_id)
# ----------------------
STATE: Dict[str, Dict[str, Any]] = {}
# e.g. STATE[mrid] = {
#   "vectorstore": InMemoryVectorStore,
#   "current_url": str,
#   "db_bundle": dict,
#   "messages": list[{"role": "...", "content": "..."}],
#   "chat_model": "...",
#   "embed_model": "...",
#   "temperature": float
# }

# ----------------------
# Helpers copied/adapted from your Streamlit app
# ----------------------
def is_arabic(text: str) -> bool:
    return bool(re.search(r"[\u0600-\u06FF]", text or ""))

def arabic_char_ratio(s: str) -> float:
    letters = [c for c in s if c.isalpha()]
    if not letters: return 0.0
    ar = [c for c in letters if "\u0600" <= c <= "\u06FF"]
    return len(ar) / len(letters)

def target_lang_for(text: str) -> str:
    return "Arabic" if is_arabic(text) else "English"

LANGUAGE_POLICY = """LANGUAGE POLICY:
- Write the entire answer in {target_lang} only.
- Never use any language other than {target_lang}.
- If the context uses other languages, translate quotes into {target_lang} and use the translation only.
- Keep code/URLs/names as-is when necessary; but all prose must be in {target_lang}.
"""

TRANSLATE_TEMPLATE = """{language_policy}
Rewrite the following response in {target_lang} only. Keep meaning identical. Do not add anything new.

[TEXT]
{text}
"""

CHAT_TEMPLATE = """{language_policy}
You are a smart, friendly assistant. Talk naturally and briefly (max 6 lines). No headings or long sections.

Grounding:
- Use ONLY the combined Context (URL + DB). If info is missing, say "I don't know" and ask for Match Result ID or a URL.
- If the user's idea conflicts with program rules, say it's out-of-scope and suggest a close, compliant alternative.

Style:
- Keep it short, like normal chat.
- If the user asks "why/لماذا", add ONE short reason.
- If the user asks "how / what do I need / steps / كيف", give: Step 1, Step 2, Step 3 (very concise).

Tech mode: {tech_mode}
- If "on": Recommend 1-2 specific technologies by NAME that comply with Context, each with one-line reason.

Feature mode: {feature_mode}
- If "on": Suggest 1-2 NEW features not already stated; improve existing ideas; keep functional and creative.

DB Snapshot:
- Description present: {desc_present}
- Improvements count: {improvements_count}
- Reasons count: {reasons_count}

Context (URL + DB):
{context}

User:
{question}
"""

SUMMARY_TEMPLATE = """Analyze this conversation and produce a concise bullet summary.

### Highlights
- [Top 3-5 points]

### Decisions
- [Up to 3 decisions or "None"]

### Next Steps
- [3-5 short action bullets]

---
CONVERSATION:
{chat_log}
"""

def is_valid_url(url: str) -> bool:
    try:
        r = urlparse(url)
        return all([r.scheme, r.netloc])
    except Exception:
        return False

def safe_invoke(runnable, inputs: dict, max_retries: int = 3) -> str:
    last_err = None
    for a in range(max_retries):
        try:
            out = runnable.invoke(inputs)
            return out.content.strip() if hasattr(out, "content") else str(out).strip()
        except Exception as e:
            last_err = e
            logger.warning(f"invoke attempt {a+1} failed: {e}")
    return f"Error: Could not generate response. Details: {last_err}"

def is_tech_request(txt: str) -> bool:
    if not txt: return False
    t = txt.lower()
    kw = ["tech","technology","stack","framework","library","sdk","api","database","deploy","deployment","architecture",
          "تقنية","تكنولوجيا","تقنيات","مكتبة","إطار","فريمورك","ستاك","قاعدة بيانات","نشر","بنية"]
    return any(k in t for k in kw)

def is_feature_request(txt: str) -> bool:
    if not txt: return False
    t = txt.lower()
    kw = ["feature","features","functionality","functions","ميزة","ميزات","خاصية","خصائص"]
    return any(k in t for k in kw)

def json_snippet(x: Any, max_chars: int = 1200) -> str:
    try:
        s = json.dumps(x, ensure_ascii=False, indent=2)
    except Exception:
        s = str(x)
    return s if len(s) <= max_chars else s[:max_chars] + " …"

# Models
def get_models(temperature: float, chat_model: str, embed_model: str):
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    chat_llm = ChatOpenAI(model=chat_model, temperature=temperature, api_key=api_key)
    embeddings = OpenAIEmbeddings(model=embed_model, api_key=api_key)
    return chat_llm, embeddings

def make_chain(template: str, llm):
    prompt = ChatPromptTemplate.from_template("{language_policy}\n\n" + template)
    return prompt | llm

# Supabase
def init_supabase() -> Optional[Client]:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key: return None
    try:
        return create_client(url, key)
    except Exception as e:
        logger.error(f"Supabase init failed: {e}")
        return None

def fetch_chat_bundle(sb: Client, match_result_id: str) -> Dict[str, Any]:
    out = {"improvement": None, "reason": None, "project_id": None, "description": "", "source_url": ""}
    try:
        mr_id = (match_result_id or "").strip()
        if not mr_id: return out
        mr = sb.table("match_results").select("*").eq("id", mr_id).limit(1).execute()
        row = (mr.data or [None])[0]
        if not row: return out

        improvement = row.get("improvements") if row.get("improvements") is not None else row.get("improveness")
        reason      = row.get("reasons") if row.get("reasons") is not None else row.get("reason")
        source_url  = (row.get("source_url") or row.get("sourse_url") or "").strip()

        out.update({
            "improvement": improvement,
            "reason": reason,
            "project_id": row.get("project_id"),
            "source_url": source_url
        })

        if out["project_id"]:
            proj = sb.table("projects").select("description").eq("id", out["project_id"]).limit(1).execute()
            prow = (proj.data or [None])[0]
            if prow and prow.get("description"): out["description"] = prow["description"]
        return out
    except Exception as e:
        logger.error(f"fetch_chat_bundle failed: {e}")
        return out

def seed_chatbot_row_from_bundle(sb: Client, match_result_id: str, bundle: dict, idea_description_from_ui: str = "") -> dict:
    try:
        mr_id = (match_result_id or "").strip()
        if not mr_id: return {"ok": False, "written": {}, "error": "Empty match_result_id"}
        project_id     = (bundle or {}).get("project_id") or None
        source_url     = ((bundle or {}).get("source_url") or "").strip()
        idea_desc      = (idea_description_from_ui or (bundle or {}).get("description") or "").strip()
        payload = {"match_result_id": mr_id}
        if project_id: payload["project_id"] = project_id
        if idea_desc:  payload["idea_description"] = idea_desc
        if source_url: payload["source_url"] = source_url
        if len(payload) == 1:
            return {"ok": False, "written": payload, "error": "No non-empty fields to seed"}
        sb.table("chatbot").upsert(payload, on_conflict="match_result_id").execute()
        return {"ok": True, "written": payload, "error": None}
    except Exception as e:
        return {"ok": False, "written": {}, "error": str(e)}

def save_chat_event(sb: Client, mrid: str, project_id: Optional[str], idea_description: str, role: str, content: str, source_url: str = ""):
    try:
        mrid = (mrid or "").strip()
        if not mrid: return
        row = sb.table("chatbot").select("convo").eq("match_result_id", mrid).limit(1).execute()
        row = (row.data or [None])[0]
        convo = row.get("convo") if row else []
        if not isinstance(convo, list): convo = []
        convo.append({"role": role, "content": content})
        payload = {"match_result_id": mrid, "convo": convo}
        if role == "assistant" and content: payload["last_reply"] = content
        if project_id: payload["project_id"] = project_id
        if idea_description: payload["idea_description"] = idea_description
        if source_url: payload["source_url"] = source_url
        sb.table("chatbot").upsert(payload, on_conflict="match_result_id").execute()
    except Exception as e:
        logger.error(f"save_chat_event failed: {e}")

def save_summary(sb: Client, mrid: str, summary_md: str):
    try:
        sb.table("chatbot").update({"summary": summary_md}).eq("match_result_id", mrid).execute()
    except Exception as e:
        logger.error(f"save_summary failed: {e}")

def test_supabase_path(sb: Client, mrid: str, also_test_write: bool = False) -> Dict[str, Any]:
    status = {"connected": bool(sb), "read_any_match_results": None, "read_specific_match_result": None,
              "read_project_description": None, "write_chatbot": None, "errors": []}
    if not sb:
        status["errors"].append("Supabase client not initialized.")
        return status
    try:
        any_mr = sb.table("match_results").select("id").limit(1).execute()
        status["read_any_match_results"] = bool(any_mr.data)
        if not any_mr.data:
            status["errors"].append("match_results returned no rows.")
    except Exception as e:
        status["read_any_match_results"] = False
        status["errors"].append(f"Cannot read match_results: {e}")
        return status

    if mrid:
        try:
            mr = sb.table("match_results").select("*").eq("id", mrid).limit(1).execute()
            row = (mr.data or [None])[0]
            status["read_specific_match_result"] = bool(row)
            if row and row.get("project_id"):
                try:
                    pr = sb.table("projects").select("description").eq("id", row["project_id"]).limit(1).execute()
                    prow = (pr.data or [None])[0]
                    status["read_project_description"] = bool(prow and prow.get("description") is not None)
                except Exception as e:
                    status["read_project_description"] = False
                    status["errors"].append(f"Cannot read projects.description: {e}")
        except Exception as e:
            status["read_specific_match_result"] = False
            status["errors"].append(f"Cannot read specific match_results: {e}")

    if also_test_write and mrid:
        try:
            b = fetch_chat_bundle(sb, mrid)
            seed_chatbot_row_from_bundle(sb, mrid, b, b.get("description", ""))
            status["write_chatbot"] = True
        except Exception as e:
            status["write_chatbot"] = False
            status["errors"].append(f"Cannot upsert into chatbot: {e}")
    return status

# RAG helpers
def ensure_vectorstore_for(mrid: str, embed_model: str):
    if mrid not in STATE: STATE[mrid] = {}
    if ("vectorstore" not in STATE[mrid]) or (STATE[mrid].get("embed_model") != embed_model):
        _, embeddings = get_models(
            STATE[mrid].get("temperature", float(os.getenv("TEMPERATURE", "0.6"))),
            STATE[mrid].get("chat_model", os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")),
            embed_model
        )
        STATE[mrid]["vectorstore"] = InMemoryVectorStore(embeddings)
        STATE[mrid]["embed_model"] = embed_model

def add_documents(mrid: str, docs):
    if not docs: return
    ensure_vectorstore_for(mrid, STATE[mrid]["embed_model"])
    STATE[mrid]["vectorstore"].add_documents(docs)
    STATE[mrid]["doc_count"] = STATE[mrid].get("doc_count", 0) + len(docs)

def retrieve_context(mrid: str, query: str, k: int = 6) -> str:
    try:
        vs = STATE.get(mrid, {}).get("vectorstore")
        if not vs: return ""
        hits = vs.similarity_search(query, k=k)
        return "\n\n".join([d.page_content for d in hits])
    except Exception as e:
        logger.error(f"retrieve_context failed: {e}")
        return ""

def load_page(url: str):
    loader = SeleniumURLLoader(urls=[url])
    docs = loader.load()
    if not docs: raise ValueError("No content extracted from URL")
    return docs

def split_text(documents):
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, add_start_index=True)
    return splitter.split_documents(documents)

def load_and_index_url(mrid: str, url: str) -> int:
    if not is_valid_url(url): raise ValueError("Invalid URL format")
    docs = load_page(url)
    chunks = split_text(docs)
    if not chunks: return 0
    add_documents(mrid, chunks)
    STATE[mrid]["current_url"] = url
    return len(chunks)

def enforce_language(text: str, target_lang: str, translator_chain):
    ar_ratio = arabic_char_ratio(text)
    if target_lang == "Arabic" and ar_ratio < 0.30 and translator_chain:
        return safe_invoke(translator_chain, {"text": text, "target_lang": target_lang, "language_policy": LANGUAGE_POLICY})
    if target_lang == "English" and ar_ratio > 0.20 and translator_chain:
        return safe_invoke(translator_chain, {"text": text, "target_lang": target_lang, "language_policy": LANGUAGE_POLICY})
    return text

def summarize_msgs(messages: List[Dict[str, str]], chat_llm) -> str:
    if not messages: return "No conversation to summarize yet."
    chat_lines = []
    for m in messages[-20:]:
        role = m.get("role","user")
        text = (m.get("content") or "").strip()
        if text and len(text) > 10:
            clean = re.sub(r"\n+", " ", text)[:500]
            chat_lines.append(f"{role}: {clean}")
    chat_log = "\n".join(chat_lines)
    summary_chain = make_chain(SUMMARY_TEMPLATE, chat_llm)
    return safe_invoke(summary_chain, {
        "chat_log": chat_log,
        "language_policy": LANGUAGE_POLICY,
        "target_lang": target_lang_for(chat_log)
    })

# ----------------------
# API Schemas
# ----------------------
class InitIn(BaseModel):
    match_result_id: str
    idea_description: str | None = None

class ChatIn(BaseModel):
    match_result_id: str
    message: str
    idea_description: str | None = None

class SummaryIn(BaseModel):
    match_result_id: str

class TestIn(BaseModel):
    match_result_id: str | None = None
    write: bool = False

# ----------------------
# Defaults for a session
# ----------------------
def ensure_defaults(mrid: str):
    if mrid not in STATE: STATE[mrid] = {}
    STATE[mrid].setdefault("chat_model", os.getenv("OPENAI_CHAT_MODEL","gpt-4o-mini"))
    STATE[mrid].setdefault("embed_model", os.getenv("OPENAI_EMBED_MODEL","text-embedding-3-small"))
    STATE[mrid].setdefault("temperature", float(os.getenv("TEMPERATURE","0.6")))
    STATE[mrid].setdefault("messages", [])
    STATE[mrid].setdefault("doc_count", 0)
    STATE[mrid].setdefault("current_url", "")
    STATE[mrid].setdefault("db_bundle", {})

# ----------------------
# Endpoints
# ----------------------
@app.get("/health")
def health():
    return {"ok": True}

@app.post("/init")
def init(payload: InitIn):
    mrid = payload.match_result_id.strip()
    if not mrid: raise HTTPException(400, "match_result_id required")
    ensure_defaults(mrid)

    sb = init_supabase()
    if not sb: raise HTTPException(500, "Supabase not connected. Set SUPABASE_URL and SUPABASE_SERVICE_KEY")
    bundle = fetch_chat_bundle(sb, mrid)
    STATE[mrid]["db_bundle"] = bundle

    seed_result = seed_chatbot_row_from_bundle(sb, mrid, bundle, (payload.idea_description or ""))
    chunks = 0
    src_url = (bundle.get("source_url") or "").strip()
    if src_url:
        ensure_vectorstore_for(mrid, STATE[mrid]["embed_model"])
        try:
            chunks = load_and_index_url(mrid, src_url)
        except Exception as e:
            logger.warning(f"load url failed: {e}")

    return {"ok": True, "seeded": seed_result, "source_url": src_url, "chunks_indexed": chunks, "bundle": bundle}

@app.post("/chat")
def chat(payload: ChatIn):
    mrid = payload.match_result_id.strip()
    msg  = (payload.message or "").strip()
    if not mrid or not msg: raise HTTPException(400, "match_result_id and message required")
    ensure_defaults(mrid)

    # models
    try:
        chat_llm, _ = get_models(STATE[mrid]["temperature"], STATE[mrid]["chat_model"], STATE[mrid]["embed_model"])
    except Exception as e:
        raise HTTPException(500, f"Model init failed: {e}")

    chat_chain       = make_chain(CHAT_TEMPLATE, chat_llm)
    translator_chain = make_chain(TRANSLATE_TEMPLATE, chat_llm)

    web_ctx = retrieve_context(mrid, msg, k=6) if STATE[mrid].get("doc_count",0) > 0 else ""
    dbb     = STATE[mrid].get("db_bundle") or {}

    def build_db_context(bundle: Dict[str, Any], user_desc: str) -> str:
        pieces = []
        desc = (user_desc or "").strip() or (bundle.get("description") or "").strip()
        if desc: pieces.append(f"PROJECT_DESCRIPTION:\n{desc}")
        if bundle.get("improvement"): pieces.append(f"IMPROVEMENT_JSONB:\n{json_snippet(bundle.get('improvement'))}")
        if bundle.get("reason"):      pieces.append(f"REASON_JSONB:\n{json_snippet(bundle.get('reason'))}")
        return "\n\n".join(pieces)

    db_ctx = build_db_context(dbb, payload.idea_description or "")
    merged = "\n\n".join([p for p in [("[WEB_CONTEXT]\n"+web_ctx) if web_ctx else "", ("[DB_CONTEXT]\n"+db_ctx) if db_ctx else ""] if p])

    target_lang  = target_lang_for(msg)
    tech_mode    = "on" if is_tech_request(msg) else "off"
    feature_mode = "on" if is_feature_request(msg) else "off"

    # push user message in memory
    STATE[mrid]["messages"].append({"role":"user","content":msg})

    if not merged.strip():
        reply = "ما عندي سياق — ابدأ من Match Result أولاً." if target_lang=="Arabic" else "I don't know—no context loaded. Initialize from Match Result first."
    else:
        reply = safe_invoke(chat_chain, {
            "question": msg,
            "context": merged,
            "language_policy": LANGUAGE_POLICY,
            "target_lang": target_lang,
            "tech_mode": tech_mode,
            "feature_mode": feature_mode,
            "desc_present": "yes" if (dbb.get("description") or (payload.idea_description or "").strip()) else "no",
            "improvements_count": len(dbb.get("improvement") or []) if isinstance(dbb.get("improvement"), list) else (1 if dbb.get("improvement") else 0),
            "reasons_count": len(dbb.get("reason") or []) if isinstance(dbb.get("reason"), list) else (1 if dbb.get("reason") else 0),
        })
        reply = enforce_language(reply, target_lang, translator_chain)

    # save assistant message
    STATE[mrid]["messages"].append({"role":"assistant","content":reply})

    # persist to supabase (if configured)
    sb = init_supabase()
    citations: List[str] = []
    if STATE[mrid].get("current_url"):
        citations.append(STATE[mrid]["current_url"])
    if dbb.get("improvement"): citations.append("DB: improvements")
    if dbb.get("reason"):      citations.append("DB: reasons")

    if sb:
        try:
            save_chat_event(sb, mrid, dbb.get("project_id"), (payload.idea_description or dbb.get("description","")), "user", msg, dbb.get("source_url",""))
            save_chat_event(sb, mrid, dbb.get("project_id"), (payload.idea_description or dbb.get("description","")), "assistant", reply, dbb.get("source_url",""))
        except Exception as e:
            logger.warning(f"save_chat_event supabase failed: {e}")

    return {"reply": reply, "citations": citations}

@app.post("/summary")
def summary(payload: SummaryIn):
    mrid = payload.match_result_id.strip()
    if not mrid: raise HTTPException(400, "match_result_id required")
    ensure_defaults(mrid)

    chat_llm, _ = get_models(STATE[mrid]["temperature"], STATE[mrid]["chat_model"], STATE[mrid]["embed_model"])
    summary_md = summarize_msgs(STATE[mrid]["messages"], chat_llm)

    sb = init_supabase()
    if sb and summary_md:
        try:
            save_summary(sb, mrid, summary_md)
        except Exception as e:
            logger.warning(f"save_summary supabase failed: {e}")

    return {"summary": summary_md}

@app.post("/test-supabase")
def test_supabase(payload: TestIn):
    sb = init_supabase()
    res = test_supabase_path(sb, (payload.match_result_id or "").strip(), also_test_write=payload.write) if sb else {
        "connected": False, "errors": ["Supabase client not initialized."]
    }
    return res
