from typing import Any, Dict, Optional, List
from datetime import datetime, timezone
import os
from supabase import create_client, Client
from postgrest.exceptions import APIError
from .config import PROJECTS_TABLE, MATCH_TABLE

def supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY")
    return create_client(url, key)

# Columns in your schema
REQUIRED_FIELDS = {
    "project_id", "project_slug",
    "program_id", "program_name", "source_url",
    "rank",
    "score_rule", "score_content", "score_goal",
    "score_final_raw", "score_final_cal", "raw_distance",
    "run_at",
}

OPTIONAL_FIELDS = {
    "subs_sector", "subs_stage", "subs_funding",
    "reasons", "improvements",
    "evidence_project", "evidence_program",
}

def _row_from_result(project_id: str,
                     project_slug: Optional[str],
                     r: Dict[str, Any],
                     run_at_iso: str) -> Dict[str, Any]:
    s = r["scores"]; subs = r["subscores"]
    ev = r.get("evidence") or {}
    row = {
        "project_id": project_id,
        "project_slug": project_slug,
        "program_id": r.get("program_id"),
        "program_name": r.get("program_name"),
        "source_url": r.get("source_url"),
        "rank": r.get("rank"),

        "score_rule": s.get("rule"),
        "score_content": s.get("content"),
        "score_goal": s.get("goal"),
        "score_final_raw": s.get("final_raw"),
        "score_final_cal": s.get("final_cal"),
        "raw_distance": s.get("raw_distance"),

        "subs_sector": subs.get("sector"),
        "subs_stage": subs.get("stage"),
        "subs_funding": subs.get("funding"),

        "reasons": r.get("reasons"),
        "improvements": r.get("improvements"),

        # split evidence -> evidence_project/evidence_program to match your table
        "evidence_project": ev.get("project"),
        "evidence_program": ev.get("program"),

        "run_at": run_at_iso,
    }
    return row

def insert_match_results_only(out: Dict[str, Any],
                              table: str = MATCH_TABLE,
                              upsert: bool = True) -> Dict[str, Any]:
    """
    out = {
      "project_id": "...",
      "project_slug": "...",    # optional but preferred
      "run_at": "...",
      "results": [ { ... } ]
    }
    """
    sb = supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    project_id = out.get("project_id")
    project_slug = out.get("project_slug")  # may be None
    run_at_iso = out.get("run_at") or now_iso  # <<< coalesce None -> now
    rows: List[Dict[str, Any]] = []

    for r in out.get("results", []):
        rows.append(_row_from_result(project_id, project_slug, r, run_at_iso))

    if not rows:
        return {"inserted": 0, "data": []}

    q = sb.table(table)
    try:
        resp = (q.upsert(rows) if upsert else q.insert(rows)).execute()
        return {"inserted": len(rows), "data": resp.data}
    except APIError as e:
        # If any optional column is missing in DB, retry with the strictly required set
        if getattr(e, "code", None) == "PGRST204":
            trimmed = [{k: v for k, v in row.items() if k in REQUIRED_FIELDS} for row in rows]
            resp2 = (q.upsert(trimmed) if upsert else q.insert(trimmed)).execute()
            return {"inserted": len(trimmed), "data": resp2.data}
        raise
