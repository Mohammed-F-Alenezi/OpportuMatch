# back/routers/eda.py
import json
from pathlib import Path
from typing import Optional, Dict, Any, List

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/eda", tags=["EDA"])

# --- paths (relative to 'back')
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "group_baseline.csv"     # <-- put your CSV here
META_PATH = BASE_DIR / "meta" / "readiness_meta.json"    # <-- optional

# in-memory cache
_baseline_df: Optional[pd.DataFrame] = None
_meta: Dict[str, Any] = {}

def _load_baseline() -> pd.DataFrame:
    global _baseline_df
    if _baseline_df is not None:
        return _baseline_df

    if not DATA_PATH.exists():
        raise RuntimeError(f"Baseline CSV not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    # Normalize columns for safer matching on the frontend
    df.columns = [str(c).strip() for c in df.columns]

    _baseline_df = df
    return _baseline_df

def _load_meta() -> Dict[str, Any]:
    global _meta
    if _meta:
        return _meta
    if META_PATH.exists():
        try:
            _meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        except Exception:
            _meta = {}
    else:
        _meta = {}
    return _meta

@router.get("/health")
def health() -> Dict[str, str]:
    try:
        _ = _load_baseline()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "down", "error": str(e)}

@router.get("/baseline")
def baseline() -> Dict[str, Any]:
    """
    Frontend expects:
    {
      "columns": [...],
      "rows": [ {col: value, ...}, ... ],
      "meta": {...}   # optional
    }
    """
    try:
        df = _load_baseline()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load baseline: {e}")

    # Keep types JSON-friendly
    rows: List[Dict[str, Any]] = df.where(pd.notna(df), None).to_dict(orient="records")
    meta = _load_meta()

    return {
        "columns": list(df.columns),
        "rows": rows,
        "meta": meta
    }
