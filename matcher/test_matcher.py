# test_matcher.py
import os, re, json
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple, Optional

from dotenv import load_dotenv, find_dotenv
from supabase import create_client, Client

# --- Load env early (root .env preferred) ---
load_dotenv(find_dotenv())

# ----------------------------
# Config / constants
# ----------------------------
TOP_K = 5  # force top-5
PERSIST_DIR = os.getenv("PERSIST_DIR", "chroma_rag")
COLLECTION  = os.getenv("COLLECTION", "programs_index")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
CALIBRATION = {"strategy": "relative_minmax", "range": (0.70, 0.95)}

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
PROJECTS_TABLE = os.getenv("PROJECTS_TABLE", "projects")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Set SUPABASE_URL and SUPABASE_KEY in your .env")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ----------------------------
# Vector DB loader
# ----------------------------
def load_vectordb():
    # Try to use your vectorstore module if present
    try:
        from vectorstore import get_vectordb  # your helper (if you wrote it)
        vdb = get_vectordb(persist_directory=PERSIST_DIR, collection_name=COLLECTION, embedding_model=EMBED_MODEL)
        print(f"VectorDB loaded via vectorstore.get_vectordb → '{COLLECTION}' @ '{PERSIST_DIR}'")
        return vdb
    except Exception:
        # Fallback: construct directly
        from langchain_openai import OpenAIEmbeddings
        from langchain_chroma import Chroma
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY missing in .env")
        emb = OpenAIEmbeddings(model=EMBED_MODEL)
        vdb = Chroma(collection_name=COLLECTION, persist_directory=PERSIST_DIR, embedding_function=emb)
        print(f"VectorDB loaded via fallback → '{COLLECTION}' @ '{PERSIST_DIR}'")
        return vdb

vectordb = load_vectordb()

# ----------------------------
# Retrieval + Scoring imports
# ----------------------------
from retrieval import retrieve_candidates
from scoring import rank_with_llm_granular, apply_calibration

# ----------------------------
# Supabase fetch
# ----------------------------
def _to_list(v):
    if v is None: return []
    if isinstance(v, list): return [x for x in v if str(x).strip()]
    s = str(v).strip()
    if not s: return []
    try:
        arr = json.loads(s)
        if isinstance(arr, list): return [x for x in arr if str(x).strip()]
    except Exception:
        pass
    return [x.strip() for x in s.split(",") if x.strip()]

def fetch_project_from_supabase(project_id: Any = None, slug: Optional[str] = None, table: str = PROJECTS_TABLE) -> Dict[str, Any]:
    if project_id:
        res = sb.table(table).select("*").eq("id", project_id).limit(1).execute()
    elif slug:
        res = sb.table(table).select("*").eq("slug", slug).limit(1).execute()
    else:
        raise ValueError("Provide project_id OR slug")
    if not res.data:
        raise ValueError(f"Project not found in table='{table}'")
    r = res.data[0]
    # normalize shape used by recommenders
    return {
        "id": r.get("id"),
        "slug": r.get("slug"),
        "name": r.get("name") or "",
        "description": r.get("description") or "",
        "sectors": _to_list(r.get("sectors") or r.get("sector_tags") or r.get("sector")),
        "stage": r.get("stage") or "",
        "funding_need": float(r.get("funding_need") or 0.0),
        "goals": _to_list(r.get("goals") or r.get("objectives") or r.get("target_goals")),
    }

# ----------------------------
# Helpers for packaging
# ----------------------------
def _clean_url(u: Optional[str]) -> Optional[str]:
    if not u: return None
    u = u.strip()
    m = re.search(r"\((https?://[^)]+)\)", u)       # markdown (...url...)
    if m: return m.group(1)
    hits = re.findall(r"https?://\S+", u)           # any http(s)
    return hits[-1] if hits else u

def _program_identity(md: dict, doc_source: Optional[str] = None):
    pid = (md.get("id") or md.get("program_id") or md.get("slug") or md.get("uuid") or md.get("code") or doc_source)
    pname = md.get("name") or md.get("program_name") or md.get("title") or "Program"
    purl = _clean_url(md.get("url") or md.get("source_url") or doc_source)
    return pid or pname, pname, purl

def _result_block(r, project_row):
    md = (r["doc"].metadata or {})
    src = md.get("source_path") or md.get("source")
    program_id, program_name, source_url = _program_identity(md, src)
    s = r["scores"]; subs = r["subscores"]
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
            "raw_distance": r["raw_distance"],
        },
        "subscores": {
            "sector": subs.get("sector", 0.0),
            "stage":  subs.get("stage", 0.0),
            "funding":subs.get("funding", 0.0),
        },
        "reasons": r.get("reasons") or [],
        "improvements": r.get("improvements") or [],
        "evidence": {
            "project": [
                project_row.get("description"),
                ", ".join((project_row.get("goals") or [])[:5]) or None,
            ],
            "program": [
                md.get("objectives") or md.get("description"),
                ", ".join((md.get("goals") or [])[:5]) or None,
            ],
        },
    }

def build_payload(project_row, ranked_rows):
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    ranked_rows = ranked_rows[:TOP_K]  # keep top-5 explicitly
    return {
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
            "run_at": now_iso,
            "weights": {"rule": 0.45, "content": 0.35, "goal": 0.20},
            "retrieval": {"collection": COLLECTION, "metric": "cosine", "k": TOP_K},
            "calibration": {"strategy": CALIBRATION["strategy"], "range": list(CALIBRATION["range"])},
            "models": {"llm": OPENAI_MODEL, "embedding": EMBED_MODEL},
        },
        "results": [_result_block(r, project_row) for r in ranked_rows],
    }

# ----------------------------
# DB insert (match_results)
# ----------------------------
def insert_match_results_only(out: Dict[str, Any], table: str = "match_results", upsert: bool = True) -> int:
    proj = out.get("project_ref", {}) or {}
    meta = out.get("meta", {}) or {}
    results: List[Dict[str, Any]] = out.get("results", []) or []

    run_at = meta.get("run_at")
    project_id = proj.get("id")
    project_slug = proj.get("slug")

    rows = []
    for r in results:
        scores = r.get("scores", {}) or {}
        subs   = r.get("subscores", {}) or {}
        evid   = r.get("evidence", {}) or {}
        rows.append({
            "project_id": project_id,
            "project_slug": project_slug,
            "run_at": run_at,
            "rank": int(r["rank"]),
            "program_id": r["program_id"],
            "program_name": r["program_name"],
            "source_url": r.get("source_url"),
            "score_rule": float(scores.get("rule", 0.0)),
            "score_content": float(scores.get("content", 0.0)),
            "score_goal": float(scores.get("goal", 0.0)),
            "score_final_raw": float(scores.get("final_raw", 0.0)),
            "score_final_cal": float(scores.get("final_cal", scores.get("final_raw", 0.0))),
            "raw_distance": None if scores.get("raw_distance") is None else float(scores.get("raw_distance")),
            "subs_sector": float(subs.get("sector", 0.0)),
            "subs_stage": float(subs.get("stage", 0.0)),
            "subs_funding": float(subs.get("funding", 0.0)),
            "reasons": r.get("reasons") or [],
            "improvements": r.get("improvements") or [],
            "evidence_project": (evid.get("project") or []),
            "evidence_program": (evid.get("program") or []),
        })
    if not rows:
        return 0
    if upsert:
        resp = sb.table(table).upsert(rows, on_conflict="project_id,project_slug,run_at,rank").execute()
    else:
        resp = sb.table(table).insert(rows).execute()
    return 0 if resp.data is None else len(resp.data)

# ----------------------------
# Runner
# ----------------------------
def main():
    # Choose ONE of these via env or inline:
    project_id  = os.getenv("TEST_PROJECT_ID")      # e.g. "ab0c78c2-21cd-49fd-be9a-66ceed04905e"
    project_slug= os.getenv("TEST_PROJECT_SLUG")    # e.g. "pharmacy-saas-wasfaty"

    if project_id:
        project = fetch_project_from_supabase(project_id=project_id)
    elif project_slug:
        project = fetch_project_from_supabase(slug=project_slug)
    else:
        # Hardcode for quick test (EDIT if you want)
        project = fetch_project_from_supabase(project_id="ab0c78c2-21cd-49fd-be9a-66ceed04905e")

    print(f"Using project: {project['id']} {project.get('slug') or project.get('name')}")
    # 1) retrieve
    cands = retrieve_candidates(vectordb, project, k=TOP_K)
    print(f"Retrieved {len(cands)} candidates")
    # 2) rank
    ranked = rank_with_llm_granular(project, cands, weights=(0.45,0.35,0.20))
    # 3) calibrate (presentation)
    apply_calibration(ranked, CALIBRATION["strategy"])
    # 4) pack pretty JSON
    out = build_payload(project, ranked)
    # 5) print pretty JSON (trim if huge)
    print(json.dumps(out, ensure_ascii=False, indent=2)[:2000], "...OK")
    # 6) persist top-5 rows to match_results
    inserted = insert_match_results_only(out)
    print("Inserted/Upserted rows:", inserted)

if __name__ == "__main__":
    main()
