import json, re, logging, hashlib, time
from typing import Dict, Any, List, Tuple
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import InMemoryVectorStore
from langchain_core.prompts import ChatPromptTemplate

from chatbot.config import get_models, default_chat_model, default_embed_model, default_temperature

log = logging.getLogger(__name__)

STATE: Dict[str, Dict[str, Any]] = {}
# STATE[mrid] keys:
#  vectorstore, embed_model, chat_model, temperature, doc_count, current_url,
#  db_bundle, messages, anchors,
#  memory: {"summary": str, "facts": [..], "facts_vs": InMemoryVectorStore, "next_fact_id": int},
#  memory_cfg: {"short_max_turns": int, "long_facts_k": int, "update_every_n_turns": int}

def target_lang_for(text: str) -> str:
    return "Arabic" if re.search(r"[\u0600-\u06FF]", text or "") else "English"

def make_chain(template: str, llm):
    return ChatPromptTemplate.from_template(template) | llm

def ensure_defaults(mrid: str):
    if mrid not in STATE: STATE[mrid] = {}
    S = STATE[mrid]
    S.setdefault("chat_model", default_chat_model())
    S.setdefault("embed_model", default_embed_model())
    S.setdefault("temperature", default_temperature())
    S.setdefault("messages", [])
    S.setdefault("doc_count", 0)
    S.setdefault("current_url", "")
    S.setdefault("db_bundle", {})
    S.setdefault("anchors", [])
    S.setdefault("memory_cfg", {"short_max_turns": 30, "long_facts_k": 6, "update_every_n_turns": 3})
    ensure_memory(mrid)

def ensure_vectorstore_for(mrid: str):
    want = STATE[mrid]["embed_model"]
    if ("vectorstore" not in STATE[mrid]) or (STATE[mrid].get("embed_model_name") != want):
        _, embeddings = get_models(
            STATE[mrid]["temperature"],
            STATE[mrid]["chat_model"],
            want
        )
        STATE[mrid]["vectorstore"] = InMemoryVectorStore(embeddings)
        STATE[mrid]["embed_model_name"] = want

def ensure_memory(mrid: str):
    S = STATE[mrid]
    S.setdefault("memory", {"summary": "", "facts": [], "next_fact_id": 1})
    if "facts_vs" not in S["memory"]:
        _, embeddings = get_models(S["temperature"], S["chat_model"], S["embed_model"])
        S["memory"]["facts_vs"] = InMemoryVectorStore(embeddings)

def add_documents(mrid: str, docs: List[Document]):
    if not docs: return
    ensure_vectorstore_for(mrid)
    STATE[mrid]["vectorstore"].add_documents(docs)
    STATE[mrid]["doc_count"] = STATE[mrid].get("doc_count", 0) + len(docs)

def split_text(documents: List[Document]) -> List[Document]:
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, add_start_index=True)
    return splitter.split_documents(documents)

def retrieve_context(mrid: str, query: str, k: int = 6) -> str:
    try:
        vs = STATE.get(mrid, {}).get("vectorstore")
        if not vs: return ""
        hits = vs.similarity_search(query, k=k)
        return "\n\n".join([d.page_content for d in hits])
    except Exception as e:
        log.error(f"retrieve_context failed: {e}")
        return ""

def safe_invoke(runnable, inputs: dict, max_retries: int = 3) -> str:
    last_err = None
    for i in range(max_retries):
        try:
            out = runnable.invoke(inputs)
            return out.content.strip() if hasattr(out, "content") else str(out).strip()
        except Exception as e:
            last_err = e
            log.warning(f"invoke attempt {i+1} failed: {e}")
    return f"Error: Could not generate response. Details: {last_err}"

# ---------- PT anchors ----------
_PT_LINE = re.compile(r'^\s*(PT-\d+)\s*:\s*(.+?)\s*$', re.IGNORECASE)

def extract_pt_anchors(text: str) -> List[dict]:
    if not text: return []
    lines = text.splitlines()
    anchors = []
    i = 0
    while i < len(lines):
        m = _PT_LINE.match(lines[i])
        if m:
            pt_id, title = m.group(1).upper(), m.group(2).strip()
            body_lines = []
            i += 1
            while i < len(lines) and lines[i].strip() and not _PT_LINE.match(lines[i]):
                body_lines.append(lines[i])
                i += 1
            anchors.append({"id": pt_id, "title": title, "body": "\n".join(body_lines).strip()})
        else:
            i += 1
    return anchors

def update_anchor_memory(mrid: str, reply_text: str):
    new_anchors = extract_pt_anchors(reply_text)
    if new_anchors:
        STATE[mrid]["anchors"] = new_anchors

def anchors_block(mrid: str) -> str:
    anchors = STATE.get(mrid, {}).get("anchors") or []
    if not anchors: return ""
    out = ["MOST RECENT ANCHORED LIST (for follow-ups):"]
    for a in anchors:
        out.append(f'{a["id"]}: {a["title"]}')
    return "\n".join(out)

# ---------- Short-term chat window ----------
def compact_chat_history(mrid: str, max_turns: int = None) -> str:
    cfg = STATE[mrid]["memory_cfg"]
    k = max_turns or cfg["short_max_turns"]
    msgs = STATE.get(mrid, {}).get("messages", [])
    lines = []
    for m in msgs[-k:]:
        role = m.get("role", "user").upper()
        text = (m.get("content") or "").strip()
        if text:
            lines.append(f"{role}: {text}")
    return "\n".join(lines)

# ---------- Long-term memory (summary + facts) ----------
_SUMMARIZER_TMPL = """{language_policy}
You are tracking a long conversation. Summarize the **key decisions, preferences, constraints, and ongoing plans** in ~6-10 bullets.
Keep it stable across turns and update/merge rather than rewrite.
CONVERSATION (last turns):
{chat_chunk}
"""

_FACT_EXTRACTOR_TMPL = """{language_policy}
From the conversation below, extract **concise, timeless facts** worth remembering later,
such as goals, fixed constraints, definitions, names, IDs, chosen options, or program matches.
- Return 1 fact per line, **no numbering**, max 8 lines.
- Each fact must be self-contained and unambiguous.

CONVERSATION (last turns):
{chat_chunk}
"""

def _hash(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()

def update_long_memory(mrid: str):
    ensure_memory(mrid)
    cfg = STATE[mrid]["memory_cfg"]
    msgs = STATE[mrid]["messages"]
    if not msgs: return
    turns = len([m for m in msgs if m.get("role") in ("user","assistant")])
    if turns % cfg["update_every_n_turns"] != 0:
        return

    recent_chunk = compact_chat_history(mrid, max_turns=cfg["short_max_turns"])
    llm, _ = get_models(0.2, STATE[mrid]["chat_model"], STATE[mrid]["embed_model"])
    language_policy = "Write the entire answer in {target_lang} only."
    tgt = target_lang_for(recent_chunk)

    sum_chain = make_chain(_SUMMARIZER_TMPL, llm)
    summary = safe_invoke(sum_chain, {
        "chat_chunk": recent_chunk,
        "language_policy": language_policy.format(target_lang=tgt),
        "target_lang": tgt
    })
    STATE[mrid]["memory"]["summary"] = (summary or "").strip()

    fact_chain = make_chain(_FACT_EXTRACTOR_TMPL, llm)
    facts_txt = safe_invoke(fact_chain, {
        "chat_chunk": recent_chunk,
        "language_policy": language_policy.format(target_lang=tgt),
        "target_lang": tgt
    })
    new_facts = [ln.strip() for ln in (facts_txt or "").splitlines() if ln.strip()]
    if not new_facts: return

    mem = STATE[mrid]["memory"]
    facts_vs = mem["facts_vs"]
    existing_hashes = {f["hash"] for f in mem["facts"]}
    docs_to_add = []
    for fact in new_facts:
        h = _hash(fact)
        if h in existing_hashes:
            continue
        fid = f"MF-{mem['next_fact_id']}"
        mem["next_fact_id"] += 1
        rec = {"id": fid, "text": fact, "hash": h, "ts": int(time.time())}
        mem["facts"].append(rec)
        docs_to_add.append(Document(page_content=f"[{fid}] {fact}", metadata={"type": "memory_fact"}))
    if docs_to_add:
        facts_vs.add_documents(docs_to_add)

def retrieve_long_memory(mrid: str, query: str, k: int = None) -> Tuple[str, List[str]]:
    ensure_memory(mrid)
    cfg = STATE[mrid]["memory_cfg"]
    k = k or cfg["long_facts_k"]
    mem = STATE[mrid]["memory"]
    facts_vs = mem["facts_vs"]

    window = compact_chat_history(mrid, max_turns=cfg["short_max_turns"])
    q = (query or "") + "\n" + window
    try:
        hits = facts_vs.similarity_search(q, k=k)
    except Exception:
        hits = []

    lines = []
    ids = []
    if mem.get("summary"):
        lines.append("### MEMORY SUMMARY\n" + mem["summary"].strip())
    if hits:
        lines.append("### MEMORY FACTS")
        for d in hits:
            txt = d.page_content.strip()
            lines.append(txt)
            m = re.match(r'^\[(MF-\d+)\]', txt)
            if m: ids.append(m.group(1))
    return ("\n".join(lines).strip(), ids)
