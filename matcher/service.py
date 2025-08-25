# matcher/service.py
from __future__ import annotations
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

from .vectorstore import get_vectordb           # uses your env config
from .retrieval import retrieve_candidates
from .scoring import rank_with_llm_granular, apply_calibration
from .config import OPENAI_MODEL, EMBED_MODEL, COLLECTION
from .db import insert_match_results_only as insert_rows

def _clean_url(u: Optional[str]) -> Optional[str]:
    if not u: return None
    u = u.strip()
    m = re.search(r"\((https?://[^)]+)\)", u)
    if m: return m.group(1)
    import re as _re
    hits = _re.findall(r"https?://\S+", u)
    return hits[-1] if hits else u

def _program_identity(md: dict, doc_source: Optional[str] = None):
    pid = (md.get("id") or md.get("program_id") or md.get("slug") or
           md.get("uuid") or md.get("code") or doc_source)
    pname = md.get("name") or md.get("program_name") or md.get("title") or "Program"
    purl = _clean_url(md.get("url") or md.get("source_url") or doc_source)
    return pid or pname, pname, purl

def _pack_result(r: Dict[str, Any], project_row: Dict[str, Any]) -> Dict[str, Any]:
    md = (r["doc"].metadata or {})
    src = md.get("source_path") or md.get("source")
    program_id, program_name, source_url = _program_identity(md, src)
    s = r["scores"]; subs = r.get("subscores", {}) or {}
    return {
        "rank": r["rank"],
        "program_id": program_id,
        "program_name": program_name,
        "source_url": source_url,
        "scores": {
            "rule": s["rule"],
            "content": s["content"],
            "goal": s["goal"],
            "final_raw": s["final_raw"],
            "final_cal": s.get("final_cal") or s["final_raw"],
            "raw_distance": r.get("raw_distance"),
        },
        "subscores": {
            "sector": float(subs.get("sector", 0.0)),
            "stage":  float(subs.get("stage", 0.0)),
            "funding":float(subs.get("funding", 0.0)),
        },
        "reasons": r.get("reasons") or [],
        "improvements": r.get("improvements") or [],
        "evidence": {
            "project": [project_row.get("description"), ", ".join((project_row.get("goals") or [])[:5]) or None],
            "program": [md.get("objectives") or md.get("description"), ", ".join((md.get("goals") or [])[:5]) or None],
        },
    }

def run_match_and_insert(project_row: Dict[str, Any],
                         top_k: int = 5,
                         calibration: Optional[str] = "relative_minmax") -> Dict[str, Any]:
    """
    project_row fields needed: id, slug, name, description, sectors, stage, funding_need, goals
    Returns { payload, inserted, run_at }
    """
    vdb = get_vectordb()
    user_project = {
        "name": project_row["name"],
        "description": project_row["description"],
        "sectors": project_row["sectors"],
        "stage": project_row["stage"],
        "funding_need": project_row["funding_need"],
        "goals": project_row["goals"],
    }

    cands  = retrieve_candidates(vdb, user_project, k=max(top_k, 10))
    ranked = rank_with_llm_granular(user_project, cands, weights=(0.45, 0.35, 0.20))
    apply_calibration(ranked, calibration)

    run_at_iso = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    results = [_pack_result(r, project_row) for r in ranked[:top_k]]

    payload = {
        "project_ref": {"id": project_row["id"], "slug": project_row.get("slug")},
        "project": {
            "name": project_row.get("name"),
            "description": project_row.get("description"),
            "sectors": project_row.get("sectors"),
            "stage": project_row.get("stage"),
            "funding_need": project_row.get("funding_need") or 0.0,
            "goals": project_row.get("goals"),
        },
        "meta": {
            "run_at": run_at_iso,
            "weights": {"rule": 0.45, "content": 0.35, "goal": 0.20},
            "retrieval": {"collection": COLLECTION, "metric": "cosine", "k": top_k},
            "calibration": {"strategy": calibration, "range": [0.70, 0.95]} if calibration else None,
            "models": {"llm": OPENAI_MODEL, "embedding": EMBED_MODEL},
        },
        "results": results,
    }

    # Insert only results using your robust DB helper
    # That helper expects a smaller shape: {project_id, project_slug, run_at, results}
    out_for_db = {
        "project_id": project_row["id"],
        "project_slug": project_row.get("slug"),
        "run_at": run_at_iso,
        "results": results,
    }
    wrote = insert_rows(out_for_db)   # returns {"inserted": N, "data": [...] }
    return {"payload": payload, "inserted": wrote.get("inserted", 0), "run_at": run_at_iso}
