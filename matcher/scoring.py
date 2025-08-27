# scoring.py
import json, math, random, re
from typing import Any, Dict, List, Tuple

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from matcher.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from matcher.config import OPENAI_MODEL, SEED_DEFAULT


# =========================
# Helpers to normalize LLM output
# =========================

def _to_list_of_str(x):
    if x is None:
        return []
    if isinstance(x, str):
        # split on newlines or bullet-like markers; fallback to whole string
        parts = re.split(r"(?:\n+|•|^- |\* )", x, flags=re.M)
        parts = [p.strip(" \t•-*") for p in parts if p and p.strip()]
        return parts or [x.strip()]
    if isinstance(x, (list, tuple)):
        out = []
        for v in x:
            if isinstance(v, str):
                out.append(v.strip())
            elif isinstance(v, dict):
                # try common text keys
                for k in ("text", "reason", "message", "content"):
                    if isinstance(v.get(k), str):
                        out.append(v[k].strip())
                        break
            else:
                out.append(str(v))
        return [p for p in out if p]
    # fallback
    return [str(x)]

def _clamp01(v):
    try:
        v = float(v)
    except Exception:
        return 0.0
    return 0.0 if v < 0 else 1.0 if v > 1 else v

def _normalize_eval(evd: dict) -> dict:
    """
    Ensure the LLM eval dict has correct types and keys:
    - sector_match/stage_match/funding_match in [0,1]
    - goal_alignment in [0,1]
    - reasons/improvements are List[str]
    """
    evd = dict(evd or {})
    # handle camelCase aliases if the model returns them
    mapping = {
        "sectorMatch": "sector_match",
        "stageMatch": "stage_match",
        "fundingMatch": "funding_match",
        "goalAlignment": "goal_alignment",
    }
    for k_old, k_new in mapping.items():
        if k_old in evd and k_new not in evd:
            evd[k_new] = evd.pop(k_old)

    evd["sector_match"]   = _clamp01(evd.get("sector_match", 0))
    evd["stage_match"]    = _clamp01(evd.get("stage_match", 0))
    evd["funding_match"]  = _clamp01(evd.get("funding_match", 0))
    evd["goal_alignment"] = _clamp01(evd.get("goal_alignment", 0))
    evd["reasons"]        = _to_list_of_str(evd.get("reasons"))
    evd["improvements"]   = _to_list_of_str(evd.get("improvements"))
    return evd


# =========================
# General utilities
# =========================

def _safe_01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))

def _round_tenth(x: float) -> float:
    return round(_safe_01(x) * 10.0) / 10.0

def _content_from_distance(distance: float) -> float:
    # cosine distance -> similarity
    return _safe_01(1.0 - float(distance))

def _parse_first_json(txt: str) -> Dict[str, Any]:
    s = txt.strip()
    i, j = s.find("{"), s.rfind("}")
    if i == -1 or j == -1 or j <= i:
        raise ValueError("LLM response missing JSON")
    return json.loads(s[i:j+1])

def _program_text(doc: Any) -> str:
    """Condense program metadata into a compact text for LLM scoring."""
    md = doc.metadata or {}
    name   = md.get("name") or md.get("program_name") or md.get("title") or "Program"
    desc   = md.get("description") or ""
    obj    = md.get("objectives") or ""
    goals  = md.get("goals") or []
    feats  = md.get("features") or []
    elig   = md.get("eligibility_must") or []
    sects  = md.get("sector_tags") or []
    stages = md.get("stage_tags") or []
    url    = md.get("url") or md.get("source_url")
    path   = md.get("source_path") or md.get("source")

    lines = [
        f"name: {name}",
        f"description: {desc}",
        f"objectives: {obj}",
        f"goals: {', '.join(map(str, goals))}" if goals else "",
        f"features: {', '.join(map(str, feats))}" if feats else "",
        f"eligibility_must: {', '.join(map(str, elig))}" if elig else "",
        f"sectors: {', '.join(map(str, sects))}" if sects else "",
        f"stages: {', '.join(map(str, stages))}" if stages else "",
    ]
    if url:
        lines.append(f"url: {url}")
    if path and not url:
        lines.append(f"source_path: {path}")
    if getattr(doc, "page_content", None):
        lines.append(f"content_excerpt: {doc.page_content[:1000]}")
    return "\n".join([ln for ln in lines if ln])


# =========================
# Main ranking API
# =========================

def rank_with_llm_granular(user_project: Dict[str, Any],
                           candidates: List[Tuple[Any, float]],
                           weights: Tuple[float, float, float] = (0.45, 0.35, 0.20),
                           seed: int = SEED_DEFAULT) -> List[Dict[str, Any]]:
    """
    For each candidate (doc, distance):
      - Ask LLM for sector/stage/funding/goal alignment
      - Compute rule/content/final scores with provided weights
      - Return sorted list by final_raw desc with reasons/improvements
    """
    random.seed(seed)
    llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0, top_p=1, seed=seed)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("user",   USER_PROMPT_TEMPLATE)
    ])

    out: List[Dict[str, Any]] = []
    for doc, distance in candidates:
        msg = prompt.format_messages(
            project_name=user_project.get("name", ""),
            project_description=user_project.get("description", ""),
            project_sectors=user_project.get("sectors", []),
            project_stage=user_project.get("stage", ""),
            project_funding_need=user_project.get("funding_need", ""),
            project_goals=user_project.get("goals", []),
            program_text=_program_text(doc),
        )
        resp = llm.invoke(msg)
        raw = _parse_first_json(resp.content)

        # --- normalize LLM output ---
        evd = _normalize_eval(raw)

        sector  = _round_tenth(evd["sector_match"])
        stage   = _round_tenth(evd["stage_match"])
        funding = _round_tenth(evd["funding_match"])
        goal    = _safe_01(evd["goal_alignment"])

        rule    = 0.4 * sector + 0.4 * stage + 0.2 * funding
        content = _content_from_distance(distance)     # cosine distance -> similarity
        final_raw = weights[0]*rule + weights[1]*content + weights[2]*goal

        out.append({
            "doc": doc,
            "raw_distance": float(distance),
            "scores": {
                "rule": rule,
                "content": content,
                "goal": goal,
                "final_raw": final_raw
            },
            "subscores": {
                "sector": sector,
                "stage":  stage,
                "funding": funding
            },
            "reasons": evd["reasons"],           # normalized List[str]
            "improvements": evd["improvements"], # normalized List[str]
        })

    out.sort(key=lambda r: r["scores"]["final_raw"], reverse=True)
    for i, r in enumerate(out, start=1):
        r["rank"] = i
    return out


# =========================
# Calibration (Phase 6)
# =========================

def _calibrate_batch(vals: List[float], mode: str) -> List[float]:
    if not vals:
        return vals
    if mode == "relative_minmax":
        lo, hi = min(vals), max(vals)
        if abs(hi - lo) < 1e-9:
            return [0.55 for _ in vals]
        return [0.40 + 0.45 * ((v - lo) / (hi - lo)) for v in vals]
    if mode == "affine_floor":
        return [0.6 + 0.4 * _safe_01(v) for v in vals]
    if mode == "sigmoid":
        return [0.65 + 0.30 * (1 / (1 + math.exp(-6 * (v - 0.5)))) for v in vals]
    return vals

def apply_calibration(results: List[Dict[str, Any]], mode: str) -> None:
    if not mode:
        for r in results:
            r["scores"]["final_cal"] = r["scores"]["final_raw"]
        return
    arr = [r["scores"]["final_raw"] for r in results]
    cal = _calibrate_batch(arr, mode)
    for r, c in zip(results, cal):
        r["scores"]["final_cal"] = _safe_01(c)
