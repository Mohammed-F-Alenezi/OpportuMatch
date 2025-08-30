import json, re, logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from chatbot.config import get_models

# Prompts with safe fallbacks
try:
    from chatbot.prompts import (
        BUSINESS_DEV_SYSTEM_ROLE,
        ENHANCED_CHAT_TEMPLATE,
        LANGUAGE_POLICY,
        TECHNICAL_DEEP_DIVE_TEMPLATE,
        TRANSLATE_TEMPLATE,
    )
except Exception:
    from chatbot.prompts import BUSINESS_DEV_SYSTEM_ROLE, ENHANCED_CHAT_TEMPLATE
    LANGUAGE_POLICY = """LANGUAGE POLICY:
- Write the entire answer in {target_lang} only.
- Keep code/URLs/names as-is when necessary; but all prose must be in {target_lang}.
"""
    TECHNICAL_DEEP_DIVE_TEMPLATE = ENHANCED_CHAT_TEMPLATE
    TRANSLATE_TEMPLATE = """{language_policy}
Translate the following text into {target_lang} with professional tone. Keep code blocks unchanged.

TEXT:
{text}
"""

from chatbot.models.schemas import RagInitIn, RagChatIn, RagSummaryIn, RagTestIn
from chatbot.services.state import (
    STATE, ensure_defaults, ensure_vectorstore_for, retrieve_context,
    target_lang_for, safe_invoke, make_chain,
    anchors_block, update_anchor_memory,
    compact_chat_history, retrieve_long_memory, update_long_memory
)
from chatbot.services.scraper import load_and_index_url
from chatbot.services.rag_db import fetch_chat_bundle, upsert_chatbot_seed, save_chat_turn, save_summary
from chatbot.services.helpers import (
    classify_query, extract_urls_from_context, determine_tech_depth,
    is_project_self_query, is_project_description_request
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

    # ----- LAZY-LOAD DB bundle & index URL if /rag/init was skipped -----
    dbb = STATE[mrid].get("db_bundle") or {}
    need_bundle = not any([dbb.get("description"), dbb.get("improvement"), dbb.get("reason"), dbb.get("source_url")])
    if need_bundle:
        dbb = fetch_chat_bundle(mrid)
        STATE[mrid]["db_bundle"] = dbb
        try:
            upsert_chatbot_seed(mrid, dbb, dbb.get("description", ""))
        except Exception as e:
            log.warning(f"seed on chat lazy-load failed: {e}")
        src_url = (dbb.get("source_url") or "").strip()
        if src_url and not STATE[mrid].get("current_url"):
            try:
                ensure_vectorstore_for(mrid)
                load_and_index_url(mrid, src_url)
            except Exception as e:
                log.warning(f"lazy-load url indexing failed: {e}")

    dbb = STATE[mrid]["db_bundle"]

    chat_llm, _ = get_models(STATE[mrid]["temperature"], STATE[mrid]["chat_model"], STATE[mrid]["embed_model"])

    # Decide whether to use web context for this query
    desc_present = bool((dbb.get("description") or "").strip())
    self_query = is_project_self_query(text)
    desc_request = is_project_description_request(text)

    # If the user is asking about their own project and we already have DB desc,
    # either skip web retrieval or heavily downweight it.
    use_web = True
    if desc_present and (self_query or desc_request):
        use_web = False

    web_ctx = retrieve_context(mrid, text, k=6 if use_web else 0) if STATE[mrid].get("doc_count", 0) > 0 and use_web else ""
    # ---- Build DB context (AUTHORITATIVE and placed before WEB) ----
    def build_db_context(b: Dict[str, Any], user_desc: str) -> str:
        parts = []
        desc = (user_desc or "").strip() or (b.get("description") or "").strip()
        if desc:
            parts.append(f"AUTHORITATIVE_PROJECT_DESCRIPTION (from DB):\n{desc}")
        if b.get("improvement"):
            parts.append("IMPROVEMENT_JSONB:\n" + json.dumps(b.get("improvement"), ensure_ascii=False)[:1500])
        if b.get("reason"):
            parts.append("REASON_JSONB:\n" + json.dumps(b.get("reason"), ensure_ascii=False)[:1500])
        return "\n\n".join(parts)

    db_ctx = build_db_context(dbb, payload.idea_description or "")

    # Memory blocks
    anchors_ctx = anchors_block(mrid)
    chat_history = compact_chat_history(mrid)
    long_mem_block, mem_ids = retrieve_long_memory(mrid, text)

    # IMPORTANT: DB context BEFORE web context
    merged = "\n\n".join([
        ("[ANCHORS]\n"+anchors_ctx) if anchors_ctx else "",
        ("[CHAT_HISTORY]\n"+chat_history) if chat_history else "",
        ("[LONG_MEMORY]\n"+long_mem_block) if long_mem_block else "",
        ("[DB_CONTEXT]\n"+db_ctx) if db_ctx else "",
        ("[WEB_CONTEXT]\n"+web_ctx) if web_ctx else "",
    ]).strip()

    # Dynamic guardrails to stop asking for idea if we already have it
    dynamic_role = BUSINESS_DEV_SYSTEM_ROLE
    if desc_present:
        dynamic_role += """
RUNTIME RULES:
- A DB-backed Project Description exists. Do NOT ask the user to re-enter their idea.
- When advising on the user's project, rely on the DB description as the primary source.
- If the user asks to "show my description", output the DB description verbatim first, then proceed with analysis/enhancements.
"""

    target_lang = target_lang_for(text)
    STATE[mrid]["messages"].append({"role": "user", "content": text})

    # If the user explicitly asked for "my description" and we have it, answer directly (then the LLM can elaborate)
    if desc_request and desc_present:
        desc_txt = (dbb.get("description") or "").strip()
        reply = f"{'وصف المشروع' if target_lang=='Arabic' else 'Project Description'}:\n{desc_txt}"
        # Optionally, append a short enhancement block via LLM using DB-only context:
        template = ENHANCED_CHAT_TEMPLATE
        chat_chain = make_chain(template, chat_llm)
        enhancement = safe_invoke(chat_chain, {
            "question": "Provide concise enhancements and next steps for the above project description.",
            "context": "[DB_CONTEXT]\n" + db_ctx,
            "urls": "None",
            "tech_depth": "false",
            "query_type": "strategic",
            "language_policy": LANGUAGE_POLICY.format(target_lang=target_lang),
            "target_lang": target_lang,
            "system_role": dynamic_role,
        })
        if enhancement and enhancement not in reply:
            reply = reply + "\n\n" + enhancement
        STATE[mrid]["messages"].append({"role": "assistant", "content": reply})
    else:
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
                "system_role": dynamic_role,  # <-- use dynamic guardrails
            })

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

    # Update memories
    try:
        update_anchor_memory(mrid, reply)
        update_long_memory(mrid)
    except Exception as e:
        log.warning(f"memory update failed: {e}")

    # Persist turns
    try:
        save_chat_turn(mrid, "user", text, dbb)
        save_chat_turn(mrid, "assistant", reply, dbb)
    except Exception as e:
        log.warning(f"persist chat failed: {e}")

    # Citations (include memory fact ids if used)
    citations: List[str] = []
    if STATE[mrid].get("current_url"):
        citations.append(STATE[mrid]["current_url"])
    for u in extract_urls_from_context(merged or ""):
        if u not in citations:
            citations.append(u)
    if dbb.get("improvement"):
        citations.append("DB: improvements")
    if dbb.get("reason"):
        citations.append("DB: reasons")
    if mem_ids:
        citations.extend([f"MEM:{mid}" for mid in mem_ids])

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
                pr = supabase.table("Projects").select("Description,description").eq("id", row["project_id"]).limit(1).execute()
                prow = (pr.data or [None])[0]
                res["read_project_description"] = bool(prow and ((prow.get("Description") or prow.get("description")) is not None))
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
def _compat_init(payload: RagInitIn): return rag_init(payload)
@router.post("/chat")
def _compat_chat(payload: RagChatIn): return rag_chat(payload)
@router.post("/summary")
def _compat_summary(payload: RagSummaryIn): return rag_summary(payload)
@router.post("/test-supabase")
def _compat_test(payload: RagTestIn): return rag_test(payload)
