# chatbot/services/state.py
import json, re, logging
from typing import Dict, Any, List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import InMemoryVectorStore
from langchain_core.prompts import ChatPromptTemplate

from chatbot.config import get_models, default_chat_model, default_embed_model, default_temperature

log = logging.getLogger(__name__)

STATE: Dict[str, Dict[str, Any]] = {}
# STATE[mrid] keys: vectorstore, embed_model, chat_model, temperature, doc_count, current_url, db_bundle, messages

def target_lang_for(text: str) -> str:
    return "Arabic" if re.search(r"[\u0600-\u06FF]", text or "") else "English"

def make_chain(template: str, llm):
    return ChatPromptTemplate.from_template(template) | llm

def ensure_defaults(mrid: str):
    if mrid not in STATE: STATE[mrid] = {}
    STATE[mrid].setdefault("chat_model", default_chat_model())
    STATE[mrid].setdefault("embed_model", default_embed_model())
    STATE[mrid].setdefault("temperature", default_temperature())
    STATE[mrid].setdefault("messages", [])
    STATE[mrid].setdefault("doc_count", 0)
    STATE[mrid].setdefault("current_url", "")
    STATE[mrid].setdefault("db_bundle", {})

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
