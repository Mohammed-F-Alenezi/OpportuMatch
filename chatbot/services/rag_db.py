# chatbot/services/rag_db.py
import json, logging
from typing import Any, Dict
from chatbot.db.supabase import supabase

log = logging.getLogger(__name__)

def fetch_chat_bundle(match_result_id: str) -> Dict[str, Any]:
    out = {"improvement": None, "reason": None, "project_id": None, "description": "", "source_url": ""}
    try:
        mr = supabase.table("match_results").select("*").eq("id", match_result_id).limit(1).execute()
        row = (mr.data or [None])[0]
        if not row:
            return out

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
            proj = supabase.table("projects").select("description").eq("id", out["project_id"]).limit(1).execute()
            prow = (proj.data or [None])[0]
            if prow and prow.get("description"): out["description"] = prow["description"]
        return out
    except Exception as e:
        log.error(f"fetch_chat_bundle failed: {e}")
        return out

def upsert_chatbot_seed(match_result_id: str, bundle: dict, idea_description_from_ui: str = "") -> dict:
    try:
        mrid = (match_result_id or "").strip()
        if not mrid:
            return {"ok": False, "error": "Empty match_result_id"}

        payload = {"match_result_id": mrid}
        pid  = (bundle or {}).get("project_id")
        src  = ((bundle or {}).get("source_url") or "").strip()
        idea = (idea_description_from_ui or (bundle or {}).get("description") or "").strip()
        if pid:  payload["project_id"] = pid
        if src:  payload["source_url"] = src
        if idea: payload["idea_description"] = idea

        if len(payload) == 1:
            return {"ok": False, "error": "No non-empty fields to seed", "written": payload}

        supabase.table("chatbot").upsert(payload, on_conflict="match_result_id").execute()
        return {"ok": True, "written": payload}
    except Exception as e:
        return {"ok": False, "error": str(e), "written": {}}

def save_chat_turn(mrid: str, role: str, content: str, bundle: dict):
    try:
        row = supabase.table("chatbot").select("convo").eq("match_result_id", mrid).limit(1).execute()
        row = (row.data or [None])[0]
        convo = row.get("convo") if row else []
        if not isinstance(convo, list): convo = []
        convo.append({"role": role, "content": content})
        payload = {
            "match_result_id": mrid,
            "convo": convo,
        }
        if role == "assistant":
            payload["last_reply"] = content
        pid  = (bundle or {}).get("project_id")
        idea = (bundle or {}).get("description", "")
        src  = (bundle or {}).get("source_url", "")
        if pid:  payload["project_id"] = pid
        if idea: payload["idea_description"] = idea
        if src:  payload["source_url"] = src
        supabase.table("chatbot").upsert(payload, on_conflict="match_result_id").execute()
    except Exception as e:
        log.warning(f"save_chat_turn failed: {e}")

def save_summary(mrid: str, summary_md: str):
    try:
        supabase.table("chatbot").update({"summary": summary_md}).eq("match_result_id", mrid).execute()
    except Exception as e:
        log.warning(f"save_summary failed: {e}")
