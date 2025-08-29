import json, re, logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from chatbot.config import get_models

# --------- PROMPTS IMPORT WITH SAFE FALLBACKS ----------
try:
    from chatbot.prompts import (
        BUSINESS_DEV_SYSTEM_ROLE,
        ENHANCED_CHAT_TEMPLATE,
        LANGUAGE_POLICY,            # may not exist in your prompts.py
        TECHNICAL_DEEP_DIVE_TEMPLATE,  # may not exist
        TRANSLATE_TEMPLATE,            # may not exist
    )
except Exception:
    # Minimum set from your prompts.py + light fallbacks so code never breaks
    from chatbot.prompts import BUSINESS_DEV_SYSTEM_ROLE, ENHANCED_CHAT_TEMPLATE
    LANGUAGE_POLICY = """LANGUAGE POLICY:
- Write the entire answer in {target_lang} only.
- Keep code/URLs/names as-is when necessary; but all prose must be in {target_lang}.
"""
    TECHNICAL_DEEP_DIVE_TEMPLATE = ENHANCED_CHAT_TEMPLATE  # reuse enhanced template
    TRANSLATE_TEMPLATE = """{language_policy}
Translate the following text into {target_lang} with professional tone. Keep code blocks unchanged.

TEXT:
{text}
"""

from chatbot.models.schemas import RagInitIn, RagChatIn, RagSummaryIn, RagTestIn
from chatbot.services.state import (
    STATE, ensure_defaults, ensure_vectorstore_for, retrieve_context,
    target_lang_for, safe_invoke, make_chain, anchors_block, update_anchor_memory
)
from chatbot.services.scraper import load_and_index_url
from chatbot.services.rag_db import fetch_chat_bundle, upsert_chatbot_seed, save_chat_turn, save_summary
from chatbot.services.helpers import (
    classify_query, extract_urls_from_context, determine_tech_depth,
)
from chatbot.db.supabase import supabase

log = logging.getLogger(__name__)
router = APIRouter()

@router.post("/rag/init")
def rag_init(payload: RagInitIn):
    mrid = payload.match_result_id.strip()
    if not mrid:
        raise HTTPException(400, "match_result_id required")
    ensure_defaults(mrid)

    bundle = fetch_chat_bundle(mrid)
    STATE[mrid]["db_bundle"] = bundle

    seed_res = upsert_chatbot_seed(mrid, bundle, payload.idea_description or "")

    chunks = 0
    src_url = (bundle.get("source_url") or "").strip()
    if src_url:
        ensure_vectorstore_for(mrid)
        try:
            chunks = load_and_index_url(mrid, src_url)
        except Exception as e:
            log.warning(f"load url failed: {e}")

    return {"ok": True, "seeded": seed_res, "source_url": src_url, "chunks_indexed": chunks, "bundle": bundle}

@router.post("/rag/chat")
def rag_chat(payload: RagChatIn):
    mrid = payload.match_result_id.strip()
    text = (payload.message or "").strip()
    if not mrid or not text:
        raise HTTPException(400, "match_result_id and message required")
    ensure_defaults(mrid)

    chat_llm, _ = get_models(STATE[mrid]["temperature"], STATE[mrid]["chat_model"], STATE[mrid]["embed_model"])

    web_ctx = retrieve_context(mrid, text, k=6) if STATE[mrid].get("doc_count", 0) > 0 else ""
    dbb     = STATE[mrid].get("db_bundle") or {}

    def build_db_context(b: Dict[str, Any], user_desc: str) -> str:
        parts = []
        desc = (user_desc or "").strip() or (b.get("description") or "").strip()
        if desc: parts.append(f"PROJECT_DESCRIPTION:\n{desc}")
        if b.get("improvement"):
            parts.append("IMPROVEMENT_JSONB:\n" + json.dumps(b.get("improvement"), ensure_ascii=False)[:1200])
        if b.get("reason"):
            parts.append("REASON_JSONB:\n" + json.dumps(b.get("reason"), ensure_ascii=False)[:1200])
        return "\n\n".join(parts)

    db_ctx = build_db_context(dbb, payload.idea_description or "")

    # === NEW: include the most recent anchored list to enable PT follow-ups ===
    anchors_ctx = anchors_block(mrid)

    merged = "\n\n".join([
        ("[ANCHORS]\n"+anchors_ctx) if anchors_ctx else "",
        ("[WEB_CONTEXT]\n"+web_ctx) if web_ctx else "",
        ("[DB_CONTEXT]\n"+db_ctx) if db_ctx else "",
    ]).strip()

    target_lang = target_lang_for(text)
    STATE[mrid]["messages"].append({"role": "user", "content": text})

    if not merged:
        reply = "ما عندي سياق — ابدأ من Match Result أولاً." if target_lang == "Arabic" \
                else "I don't know—no context loaded. Initialize from Match Result first."
        urls_list = []
    else:
        urls_list = extract_urls_from_context(merged)
        urls_str = ", ".join(urls_list) if urls_list else "None"
        query_type = classify_query(text)
        force_tech = bool(payload.tech_depth) or determine_tech_depth(text, merged)

        template_to_use = TECHNICAL_DEEP_DIVE_TEMPLATE if force_tech else ENHANCED_CHAT_TEMPLATE
        chat_chain       = make_chain(template_to_use, chat_llm)
        translator_chain = make_chain(TRANSLATE_TEMPLATE, chat_llm)

        reply = safe_invoke(chat_chain, {
            "question": text,
            "context": merged,
            "urls": urls_str,
            "tech_depth": "true" if force_tech else "false",
            "query_type": query_type,
            "language_policy": LANGUAGE_POLICY.format(target_lang=target_lang),
            "target_lang": target_lang,
            "system_role": BUSINESS_DEV_SYSTEM_ROLE,
        })

        # If user asked in Arabic but model replied in English, translate once.
        if target_lang == "Arabic" and not re.search(r"[\u0600-\u06FF]", reply):
            reply = safe_invoke(
                translator_chain,
                {
                    "text": reply,
                    "target_lang": target_lang,
                    "language_policy": LANGUAGE_POLICY.format(target_lang=target_lang),
                },
            )

    STATE[mrid]["messages"].append({"role": "assistant", "content": reply})

    # === NEW: capture PT anchors from this reply for future turns ===
    try:
        update_anchor_memory(mrid, reply)
    except Exception as e:
        log.warning(f"update_anchor_memory failed: {e}")

    try:
        save_chat_turn(mrid, "user", text, dbb)
        save_chat_turn(mrid, "assistant", reply, dbb)
    except Exception as e:
        log.warning(f"persist chat failed: {e}")

    citations: List[str] = []
    if STATE[mrid].get("current_url"):
        citations.append(STATE[mrid]["current_url"])
    for u in (urls_list or []):
        if u not in citations:
            citations.append(u)
    if dbb.get("improvement"):
        citations.append("DB: improvements")
    if dbb.get("reason"):
        citations.append("DB: reasons")

    return {"reply": reply, "citations": citations}

@router.post("/rag/summary")
def rag_summary(payload: RagSummaryIn):
    mrid = payload.match_result_id.strip()
    if not mrid:
        raise HTTPException(400, "match_result_id required")
    ensure_defaults(mrid)

    chat_llm, _ = get_models(0.2, STATE[mrid]["chat_model"], STATE[mrid]["embed_model"])
    chat_lines = []
    for m in STATE[mrid]["messages"][-20:]:
        role = m.get("role", "user")
        text = (m.get("content") or "").strip()
        if text:
            chat_lines.append(f"{role}: {re.sub(r'\\n+', ' ', text)[:500]}")
    chat_log = "\n".join(chat_lines)

    template = """{language_policy}
Analyze this conversation and produce a concise bullet summary.

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
    chain = make_chain(template, chat_llm)
    from chatbot.services.state import target_lang_for as _tgt
    summary = safe_invoke(chain, {
        "chat_log": chat_log,
        "language_policy": LANGUAGE_POLICY.format(target_lang=_tgt(chat_log)),
        "target_lang": _tgt(chat_log),
    })
    try:
        save_summary(mrid, summary)
    except Exception as e:
        log.warning(f"save summary failed: {e}")

    return {"summary": summary}

@router.post("/rag/test-supabase")
def rag_test(payload: RagTestIn):
    res = {"connected": True, "errors": []}
    try:
        any_mr = supabase.table("match_results").select("id").limit(1).execute()
        res["read_any_match_results"] = bool(any_mr.data)
        if payload.match_result_id:
            mr = supabase.table("match_results").select("*").eq("id", payload.match_result_id.strip()).limit(1).execute()
            row = (mr.data or [None])[0]
            res["read_specific_match_result"] = bool(row)
            if row and row.get("project_id"):
                pr = supabase.table("projects").select("description").eq("id", row["project_id"]).limit(1).execute()
                prow = (pr.data or [None])[0]
                res["read_project_description"] = bool(prow and (prow.get("description") is not None))
        if payload.write and payload.match_result_id:
            b = fetch_chat_bundle(payload.match_result_id.strip())
            upsert_chatbot_seed(payload.match_result_id.strip(), b, b.get("description",""))
            res["write_chatbot"] = True
    except Exception as e:
        res["connected"] = False
        res["errors"].append(str(e))
    return res

# Back-compat shims
@router.post("/init")
def _compat_init(payload: RagInitIn):
    return rag_init(payload)

@router.post("/chat")
def _compat_chat(payload: RagChatIn):
    return rag_chat(payload)

@router.post("/summary")
def _compat_summary(payload: RagSummaryIn):
    return rag_summary(payload)

@router.post("/test-supabase")
def _compat_test(payload: RagTestIn):
    return rag_test(payload)
