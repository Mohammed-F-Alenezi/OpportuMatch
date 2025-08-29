import json, re, logging
from typing import Dict, Any, List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import InMemoryVectorStore
from langchain_core.prompts import ChatPromptTemplate

from chatbot.config import get_models, default_chat_model, default_embed_model, default_temperature

log = logging.getLogger(__name__)

STATE: Dict[str, Dict[str, Any]] = {}
# STATE[mrid] keys:
#  vectorstore, embed_model, chat_model, temperature, doc_count, current_url,
#  db_bundle, messages, anchors (list[{"id": "PT-1", "title": "...", "body": "..."}])

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
    S.setdefault("anchors", [])  # <= NEW

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

# ---------- NEW: PT anchor helpers ----------
_PT_LINE = re.compile(r'^\s*(PT-\d+)\s*:\s*(.+?)\s*$', re.IGNORECASE)

def extract_pt_anchors(text: str) -> List[dict]:
    """
    Extracts lines like 'PT-3: Title' and grabs an optional short body block
    under each (up to a blank line). Robust to bullets.
    """
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
    """
    Store/refresh the most recent anchored list this assistant produced.
    If a reply contains PT-* anchors, we replace the memory with this new set.
    """
    new_anchors = extract_pt_anchors(reply_text)
    if new_anchors:
        STATE[mrid]["anchors"] = new_anchors

def anchors_block(mrid: str) -> str:
    """
    Render the most recent anchors so the prompt can resolve 'point 3' etc.
    """
    anchors = STATE.get(mrid, {}).get("anchors") or []
    if not anchors: return ""
    out = ["MOST RECENT ANCHORED LIST (for follow-ups):"]
    for a in anchors:
        out.append(f'{a["id"]}: {a["title"]}')
    return "\n".join(out)
