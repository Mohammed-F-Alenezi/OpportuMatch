# # matcher/service.py
# from __future__ import annotations
# import re
# from datetime import datetime, timezone
# from typing import Any, Dict, Optional, List

# from .vectorstore import get_vectordb           # uses your env config
# from .retrieval import retrieve_candidates
# from .scoring import rank_with_llm_granular, apply_calibration
# from .config import OPENAI_MODEL, EMBED_MODEL, COLLECTION
# from .db import insert_match_results_only as insert_rows

# def _clean_url(u: Optional[str]) -> Optional[str]:
#     if not u: return None
#     u = u.strip()
#     m = re.search(r"\((https?://[^)]+)\)", u)
#     if m: return m.group(1)
#     import re as _re
#     hits = _re.findall(r"https?://\S+", u)
#     return hits[-1] if hits else u

# def _program_identity(md: dict, doc_source: Optional[str] = None):
#     pid = (md.get("id") or md.get("program_id") or md.get("slug") or
#            md.get("uuid") or md.get("code") or doc_source)
#     pname = md.get("name") or md.get("program_name") or md.get("title") or "Program"
#     purl = _clean_url(md.get("url") or md.get("source_url") or doc_source)
#     return pid or pname, pname, purl

# def _pack_result(r: Dict[str, Any], project_row: Dict[str, Any]) -> Dict[str, Any]:
#     md = (r["doc"].metadata or {})
#     src = md.get("source_path") or md.get("source")
#     program_id, program_name, source_url = _program_identity(md, src)
#     s = r["scores"]; subs = r.get("subscores", {}) or {}
#     return {
#         "rank": r["rank"],
#         "program_id": program_id,
#         "program_name": program_name,
#         "source_url": source_url,
#         "scores": {
#             "rule": s["rule"],
#             "content": s["content"],
#             "goal": s["goal"],
#             "final_raw": s["final_raw"],
#             "final_cal": s.get("final_cal") or s["final_raw"],
#             "raw_distance": r.get("raw_distance"),
#         },
#         "subscores": {
#             "sector": float(subs.get("sector", 0.0)),
#             "stage":  float(subs.get("stage", 0.0)),
#             "funding":float(subs.get("funding", 0.0)),
#         },
#         "reasons": r.get("reasons") or [],
#         "improvements": r.get("improvements") or [],
#         "evidence": {
#             "project": [project_row.get("description"), ", ".join((project_row.get("goals") or [])[:5]) or None],
#             "program": [md.get("objectives") or md.get("description"), ", ".join((md.get("goals") or [])[:5]) or None],
#         },
#     }
# # --- Gating profiles (from strict to permissive) ---
# _GATING_PROFILES = {
#     "strict": [
#         {"content": 0.60, "sector": 0.70, "stage": 0.60},
#         {"content": 0.55, "sector": 0.65, "stage": 0.55},
#     ],
#     "balanced": [
#         {"content": 0.55, "sector": 0.60, "stage": 0.50},
#         {"content": 0.50, "sector": 0.55, "stage": 0.45},
#         {"content": 0.48, "sector": 0.50, "stage": 0.40},  # تخفيف بسيط
#     ],
#     "permissive": [
#         {"content": 0.50, "sector": 0.50, "stage": 0.40},
#         {"content": 0.45, "sector": 0.45, "stage": 0.35},
#     ],
# }

# def _soft_pass(r, cfg):
#     # شرط ناعم: محتوى + (قطاع أو مرحلة)
#     ok_content = r["scores"]["content"] >= cfg["content"]
#     ok_sector  = r["subscores"].get("sector", 0) >= cfg["sector"]
#     ok_stage   = r["subscores"].get("stage",  0) >= cfg["stage"]
#     return ok_content and (ok_sector or ok_stage)

# def adaptive_gate(ranked, top_k, profile="balanced", min_keep=None):
#     if min_keep is None:
#         min_keep = max(3, top_k)  # ضمان حد أدنى

#     for cfg in _GATING_PROFILES.get(profile, _GATING_PROFILES["balanced"]):
#         filt = [r for r in ranked if _soft_pass(r, cfg)]
#         if len(filt) >= min_keep:
#             return filt
#     # لو ما لقينا كفاية، نضمن على الأقل top_k من غير فلترة
#     return ranked[:top_k]

# def run_match_and_insert(project_row: Dict[str, Any],
#                          top_k: int = 5,
#                          calibration: Optional[str] = None) -> Dict[str, Any]:
#     """
#     project_row fields needed: id, slug, name, description, sectors, stage, funding_need, goals
#     Returns { payload, inserted, run_at }
#     """
#     vdb = get_vectordb()
#     user_project = {
#         "name": project_row["name"],
#         "description": project_row["description"],
#         "sectors": project_row["sectors"],
#         "stage": project_row["stage"],
#         "funding_need": project_row["funding_need"],
#         "goals": project_row["goals"],
#     }

#     cands  = retrieve_candidates(vdb, user_project, k=max(top_k, 10))
#     cands = [(d, dist) for (d, dist) in cands if dist <= 0.55]  # content >= 0.45
#     ranked = rank_with_llm_granular(user_project, cands, weights=(0.30, 0.50, 0.20))
#     ranked_filtered = adaptive_gate(ranked, top_k=top_k, profile="balanced", min_keep=max(3, top_k))
#     ranked_filtered = [r for r in ranked_filtered if r["scores"]["final_raw"] >= 0.55] or ranked_filtered


#     apply_calibration(ranked_filtered, calibration)

#     run_at_iso = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
#     results = [_pack_result(r, project_row) for r in ranked_filtered[:top_k]]

#     payload = {
#         "project_ref": {"id": project_row["id"], "slug": project_row.get("slug")},
#         "project": {
#             "name": project_row.get("name"),
#             "description": project_row.get("description"),
#             "sectors": project_row.get("sectors"),
#             "stage": project_row.get("stage"),
#             "funding_need": project_row.get("funding_need") or 0.0,
#             "goals": project_row.get("goals"),
#         },
#         "meta": {
#             "run_at": run_at_iso,
#             "weights": {"rule": 0.45, "content": 0.35, "goal": 0.20},
#             "retrieval": {"collection": COLLECTION, "metric": "cosine", "k": top_k},
#             "calibration": {"strategy": calibration, "range": [0.70, 0.95]} if calibration else None,
#             "models": {"llm": OPENAI_MODEL, "embedding": EMBED_MODEL},
#         },
#         "results": results,
#     }

#     # Insert only results using your robust DB helper
#     # That helper expects a smaller shape: {project_id, project_slug, run_at, results}
#     out_for_db = {
#         "project_id": project_row["id"],
#         "project_slug": project_row.get("slug"),
#         "run_at": run_at_iso,
#         "results": results,
#     }
#     wrote = insert_rows(out_for_db)   # returns {"inserted": N, "data": [...] }
#     return {"payload": payload, "inserted": wrote.get("inserted", 0), "run_at": run_at_iso}

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


# --------- helpers ----------
def _clean_url(u: Optional[str]) -> Optional[str]:
    if not u:
        return None
    u = u.strip()
    m = re.search(r"\((https?://[^)]+)\)", u)
    if m:
        return m.group(1)
    import re as _re
    hits = _re.findall(r"https?://\S+", u)
    return hits[-1] if hits else u

def _program_identity(md: dict, doc_source: Optional[str] = None):
    pid = (md.get("id") or md.get("program_id") or md.get("slug") or
           md.get("uuid") or md.get("code") or doc_source)
    pname = md.get("name") or md.get("program_name") or md.get("title") or "Program"
    purl = _clean_url(md.get("url") or md.get("source_url") or doc_source)
    return pid or pname, pname, purl


# --------- violations (explain why not a fit) ----------
_STAGE_MAP = {"فكرة":0, "MVP":1, "إطلاق":2, "تشغيل":3, "نمو مبكر":4, "نمو":5, "توسع":6}

def _derive_violations(md: dict, proj: dict) -> List[Dict[str, str]]:
    v: List[Dict[str, str]] = []

    # 1) Sector mismatch
    prog_secs = set(map(str, (md.get("sector_tags") or [])))
    proj_secs = set(map(str, (proj.get("sectors") or [])))
    if prog_secs and proj_secs and prog_secs.isdisjoint(proj_secs):
        v.append({
            "type": "sector_mismatch",
            "why": "قطاعات البرنامج لا تتقاطع مع قطاعات المشروع.",
            "evidence": ", ".join(sorted(prog_secs))
        })

    # 2) Stage too early
    prog_stage_vals = [_STAGE_MAP[s] for s in (md.get("stage_tags") or []) if s in _STAGE_MAP]
    if prog_stage_vals:
        min_req = min(prog_stage_vals)
        proj_val = _STAGE_MAP.get(proj.get("stage"), 0)
        gap = min_req - proj_val
        if gap >= 1:
            v.append({
                "type": "stage_too_early",
                "why": f"مرحلة المشروع أبكر من الحد الأدنى للبرنامج بفارق {gap} مرتبة.",
                "evidence": f"min_required={min_req}, project={proj_val}"
            })

    # 3) Funding gap / type
    need = float(proj.get("funding_need") or 0)
    fmin = float(md.get("funding_min") or 0)
    fmax = float(md.get("funding_max") or 0)
    ftype = (md.get("funding_type") or "").lower()
    if need > 0 and fmax > 0 and need > fmax:
        v.append({
            "type": "funding_gap",
            "why": f"احتياج المشروع ({int(need):,}) يتجاوز سقف البرنامج ({int(fmax):,}).",
            "evidence": f"range≈[{int(fmin):,}..{int(fmax):,}]"
        })
    if ftype == "in-kind" and need > 0:
        v.append({
            "type": "in_kind_vs_cash",
            "why": "البرنامج يقدم دعمًا عينيًا بينما المشروع يطلب تمويلاً نقدياً.",
            "evidence": "funding_type=in-kind"
        })

    # 4) Eligibility examples (simple heuristic)
    for cond in (md.get("eligibility_must") or []):
        if (("الصحة" in cond) or ("health" in cond)) and ("الصحة" not in proj_secs):
            v.append({
                "type": "eligibility_missing",
                "why": "شرط أهلية متعلق بقطاع الصحة غير متحقق.",
                "evidence": cond
            })
    return v


# --------- pack a single result ----------
def _pack_result(r: Dict[str, Any], project_row: Dict[str, Any]) -> Dict[str, Any]:
    md = (r["doc"].metadata or {})
    src = md.get("source_path") or md.get("source")
    program_id, program_name, source_url = _program_identity(md, src)
    s = r["scores"]; subs = r.get("subscores", {}) or {}
    out = {
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
    # attach violations (why not a fit)
    out["violations"] = _derive_violations(md, project_row)
    return out


# --------- main entry ----------
def run_match_and_insert(project_row: Dict[str, Any],
                         top_k: int = 5,
                         calibration: Optional[str] = None) -> Dict[str, Any]:
    """
    Compare the project against ALL programs, always return Top-K,
    and include 'violations' explaining mismatches (no hard gating).
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

    # Broad retrieval to cover all programs
    cands = retrieve_candidates(vdb, user_project, k=max(top_k * 10, 50))

    # Heavier weight on content; keep goals meaningful
    ranked = rank_with_llm_granular(user_project, cands, weights=(0.30, 0.50, 0.20))

    # Always take Top-K (no gating); calibration is optional (for display only)
    ranked_top = ranked[:top_k]
    apply_calibration(ranked_top, calibration)

    run_at_iso = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    results = [_pack_result(r, project_row) for r in ranked_top]

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
            "weights": {"rule": 0.30, "content": 0.50, "goal": 0.20},   # ← يطابق الاستدعاء فعلاً
            "retrieval": {"collection": COLLECTION, "metric": "cosine", "k_requested": max(top_k * 10, 50)},
            "calibration": {"strategy": calibration} if calibration else None,
            "models": {"llm": OPENAI_MODEL, "embedding": EMBED_MODEL},
            "diag": {"retrieved": len(cands), "ranked_total": len(ranked)}
        },
        "results": results,
    }

    # Insert condensed rows into DB
    out_for_db = {
        "project_id": project_row["id"],
        "project_slug": project_row.get("slug"),
        "run_at": run_at_iso,
        "results": results,
    }
    wrote = insert_rows(out_for_db)   # {"inserted": N, "data": [...] }
    return {"payload": payload, "inserted": wrote.get("inserted", 0), "run_at": run_at_iso}
