from logging import log
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from supabase import Client, create_client
# === MATCHER: imports ===
import json
from typing import Tuple
from matcher.service import run_match_and_insert

from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

from matcher.retrieval import retrieve_candidates
from matcher.scoring import rank_with_llm_granular, apply_calibration


# --------------------------------------------------------------------------------------
# Setup
# --------------------------------------------------------------------------------------
print("Starting the application...")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL/SUPABASE_KEY are required")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],               # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}
# === MATCHER: config ===
from matcher.config import PERSIST_DIR, COLLECTION, EMBED_MODEL, OPENAI_MODEL


CALIBRATION = {"strategy": "relative_minmax", "range": (0.70, 0.95)}
TOP_K = 5  # enforce top-5 results

if not os.getenv("OPENAI_API_KEY"):
    print("WARNING: OPENAI_API_KEY missing — matcher will fail when invoked.")

def _load_vectordb():
    emb = OpenAIEmbeddings(model=EMBED_MODEL)
    return Chroma(
        collection_name=COLLECTION,
        persist_directory=PERSIST_DIR,
        embedding_function=emb,
    )

try:
    VDB = _load_vectordb()
    print(f"Vector DB ready: collection='{COLLECTION}', persist='{PERSIST_DIR}'")
except Exception as e:
    VDB = None
    print("ERROR initializing vector DB:", e)


# --------------------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------------------
SECRET_KEY = "1234"         # TODO: move to env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60*24

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/register")
async def register_user(request: Request):
    data = await request.json()
    data.pop("id", None)  # don't allow client to set id
    try:
        res = supabase.table("users").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to insert user")
        return {"message": "User registered successfully", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
async def login_user(request: Request):
    data = await request.json()
    email, password = data.get("email"), data.get("password")
    res = (
        supabase.table("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = res.data[0]
    token = create_access_token(
        {"sub": str(user["id"])}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# --------------------------------------------------------------------------------------
# Models / helpers
# --------------------------------------------------------------------------------------
class ProjectIn(BaseModel):
    name: str
    description: str
    stage: str
    sectors: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)
    funding_need: Optional[float] = None

class ProjectUpdate(BaseModel):
    name: str

def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"\s+", "-", s, flags=re.UNICODE)
    s = re.sub(r"[^\w\-]+", "", s, flags=re.UNICODE)
    return s or "project"

# Enum values in DB (Arabic)
DB_STAGES = {"فكرة", "MVP", "إطلاق", "تشغيل", "نمو مبكر", "نمو", "توسع"}

# Accepted aliases -> normalized to DB enum
STAGE_ALIASES = {
    # EN
    "idea": "فكرة",
    "ideation": "فكرة",
    "prototype": "MVP",
    "mvp": "MVP",
    "launch": "إطلاق",
    "release": "إطلاق",
    "go-live": "تشغيل",
    "operate": "تشغيل",
    "production": "تشغيل",
    "early_growth": "نمو مبكر",
    "earlygrowth": "نمو مبكر",
    "growth": "نمو",
    "scale": "توسع",
    "expansion": "توسع",
    "scaleup": "توسع",
    # AR normalizations
    "اطلاق": "إطلاق",
    "تشغيل": "تشغيل",
}

def normalize_stage(v: str) -> str:
    if not v:
        return v
    v = v.strip()
    if v in DB_STAGES:
        return v
    v_l = v.lower()
    if v_l in STAGE_ALIASES:
        return STAGE_ALIASES[v_l]
    if v in STAGE_ALIASES:
        return STAGE_ALIASES[v]
    return v

# === MATCHER: helpers ===
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

def _clean_url(u: Optional[str]) -> Optional[str]:
    if not u: return None
    u = u.strip()
    m = re.search(r"\((https?://[^)]+)\)", u)       # markdown (...url...)
    if m: return m.group(1)
    hits = re.findall(r"https?://\S+", u)           # any http(s)
    return hits[-1] if hits else u

def _program_identity(md: dict, doc_source: Optional[str] = None):
    pid = (md.get("id") or md.get("program_id") or md.get("slug") or
           md.get("uuid") or md.get("code") or doc_source)
    pname = md.get("name") or md.get("program_name") or md.get("title") or "Program"
    purl = _clean_url(md.get("url") or md.get("source_url") or doc_source)
    return pid or pname, pname, purl

def _result_block(r: Dict[str, Any], project_row: Dict[str, Any]) -> Dict[str, Any]:
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

def _build_payload(project_row: Dict[str, Any], ranked_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    ranked_rows = ranked_rows[:TOP_K]
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

def _insert_match_results_only(out, table: str = "match_results", upsert: bool = True) -> int:
    proj = out.get("project_ref", {}) or {}
    meta = out.get("meta", {}) or {}
    results: List[Dict[str, Any]] = out.get("results", []) or []

    run_at = meta.get("run_at")
    project_id = proj.get("id")
    project_slug = proj.get("slug")

    rows: List[Dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00","Z")

    for r in results:
        scores = r.get("scores", {}) or {}
        subs   = r.get("subscores", {}) or {}
        evid   = r.get("evidence", {}) or {}
        rows.append({
            "created_at": now_iso,
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
            "raw_distance": None if r.get("raw_distance") is None else float(r.get("raw_distance")),
            "subs_sector": float(subs.get("sector", 0.0)),
            "subs_stage": float(subs.get("stage", 0.0)),
            "subs_funding": float(subs.get("funding", 0.0)),
            "reasons": r.get("reasons") or [],
            "improvements": r.get("improvements") or [],
            "evidence_project": (evid.get("project") or []),
            "evidence_program": (evid.get("program") or []),
        })

    if not rows:
        logger.info("No match rows to insert.")
        return 0

    try:
        if upsert:
            logger.info("Upserting %d match rows for project_id=%s run_at=%s", len(rows), project_id, run_at)
            resp = (
                supabase
                .table(table)
                .upsert(rows, on_conflict="project_id,project_slug,run_at,rank")
                .select("*")                   # <- ensure we get representation back
                .execute()
            )
        else:
            logger.info("Inserting %d match rows for project_id=%s run_at=%s", len(rows), project_id, run_at)
            resp = (
                supabase
                .table(table)
                .insert(rows)
                .select("*")                   # <- ensure we get representation back
                .execute()
            )

        inserted = 0 if resp.data is None else len(resp.data)
        logger.info("match_results returned rows: %d", inserted)

        # Defensive verification
        verify = (
            supabase.table(table)
            .select("id", count="exact")
            .eq("project_id", project_id)
            .eq("run_at", run_at)
            .execute()
        )
        v_count = getattr(verify, "count", None)
        if v_count is None:
            v_count = 0 if verify.data is None else len(verify.data)
        logger.info("match_results verify count for project_id=%s run_at=%s → %s", project_id, run_at, v_count)
        return int(v_count)

    except Exception as e:
        logger.exception("Failed inserting match_results")
        raise RuntimeError(f"match_results insert failed: {e}")




def _normalize_project_for_matcher(row):
    return {
        "id": row.get("id"),
        "slug": row.get("slug"),
        "name": row.get("name") or "",
        "description": row.get("description") or "",
        "sectors": _to_list(row.get("sectors")),
        "stage": row.get("stage") or "",
        "funding_need": float(row.get("funding_need") or 0.0),
        "goals": _to_list(row.get("goals")),
        "user_id": row.get("user_id"),
        "updated_at": row.get("updated_at"),
    }

def _run_match_for_project(project_row):
    """Retrieve → rank → calibrate → build payload (top‑5) and store rows."""
    if VDB is None:
        raise RuntimeError("Vector DB is not initialized. Check PERSIST_DIR/COLLECTION and embeddings.")
    user_project = {
        "name": project_row["name"],
        "description": project_row["description"],
        "sectors": project_row["sectors"],
        "stage": project_row["stage"],
        "funding_need": project_row["funding_need"],
        "goals": project_row["goals"],
    }
    # 1) retrieve
    cands = retrieve_candidates(VDB, user_project, k=10)
    # 2) rank
    ranked = rank_with_llm_granular(user_project, cands, weights=(0.45, 0.35, 0.20))
    # 3) calibrate (presentation)
    apply_calibration(ranked, CALIBRATION["strategy"])
    # 4) pack
    pretty = _build_payload(project_row, ranked)
    # 5) persist rows
    inserted = _insert_match_results_only(pretty)
    pretty["meta"]["inserted_rows"] = inserted
    return pretty

def _fetch_matches_for(project_id: str, run_at_iso: str, limit: int = 5):
    """Return the rows that were just inserted into match_results for this run."""
    cols = (
        "program_id, program_name, source_url, rank, run_at, "
        "score_rule, score_content, score_goal, score_final_raw, score_final_cal, raw_distance, "
        "subs_sector, subs_stage, subs_funding, "
        "reasons, improvements, evidence_project, evidence_program"
    )
    q = (
        supabase.table("match_results")
        .select(cols)
        .eq("project_id", project_id)
        .eq("run_at", run_at_iso)
        .order("rank", desc=False)
        .limit(limit)
    )
    res = q.execute()
    return res.data or []

# --------------------------------------------------------------------------------------
# Projects
# --------------------------------------------------------------------------------------
@app.get("/users/me/projects")
async def get_my_projects(current_user: int = Depends(get_current_user)):
    res = (
        supabase.table("projects")
        .select("*")
        .eq("user_id", current_user)
        .order("updated_at", desc=True)
        .execute()
    )
    return {"projects": res.data or []}

# @app.post("/projects")
@app.post("/projects")
async def create_project(p: ProjectIn, current_user: int = Depends(get_current_user)):
    stage_db = normalize_stage(p.stage)
    if stage_db not in DB_STAGES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid 'stage' value. Allowed: {', '.join(DB_STAGES)}",
        )

    # unique slug
    base_slug = slugify(p.name)
    slug = base_slug
    suffix = 2
    while True:
        exists = (
            supabase.table("projects")
            .select("id")
            .eq("slug", slug)
            .limit(1)
            .execute()
        )
        if not exists.data:
            break
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    payload = {
        "name": p.name,
        "description": p.description,
        "stage": stage_db,
        "sectors": p.sectors,
        "goals": p.goals,
        "funding_need": p.funding_need,
        "slug": slug,
        "user_id": current_user,
        "updated_at": datetime.utcnow().isoformat(),
    }

    try:
        db_ins = supabase.table("projects").insert(payload).execute()
        if not db_ins.data:
            raise HTTPException(status_code=400, detail="Failed to insert project")
        project_row = db_ins.data[0]

        # run matcher right after create
        try:
            norm = _normalize_project_for_matcher(project_row)
            resm = run_match_and_insert(norm, top_k=TOP_K, calibration=CALIBRATION["strategy"])
            match_payload = {
                "meta": { **resm["payload"]["meta"], "inserted_rows": resm["inserted"] },
                "results": resm["payload"]["results"],
            }
        except Exception as me:
            match_payload = {"error": str(me)}

        # ✅ IMPORTANT: return the response
        return {"project": project_row, "match": match_payload}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------- Run matcher for a project (insert into match_results and return rows) ----------
@app.post("/projects/{project_id}/run_match")
async def run_match_for_project_endpoint(
    project_id: str,
    top_k: int = 5,
    current_user: int = Depends(get_current_user),
):
    # 1) ownership check
    res = (
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = res.data[0]
    if proj["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Forbidden")

    # 2) normalize -> run matcher -> insert into match_results
    try:
        norm = _normalize_project_for_matcher(proj)
        pretty = _run_match_for_project(norm)  # retrieve → rank → calibrate → insert
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matcher failed: {e}")

    # 3) fetch what we just inserted (by run_at)
    run_at_iso = pretty["meta"]["run_at"]
    rows = _fetch_matches_for(project_id, run_at_iso, limit=top_k)

    return {
        "ok": True,
        "project_id": project_id,
        "run_at": run_at_iso,
        "inserted_rows": pretty["meta"].get("inserted_rows", 0),
        "results": rows,
        "meta": pretty.get("meta", {}),
    }





@app.get("/projects/summary")
async def projects_summary(current_user: int = Depends(get_current_user)):
    # 1) user's projects
    proj_res = (
        supabase.table("projects")
        .select("*")
        .eq("user_id", current_user)
        .order("updated_at", desc=True)
        .execute()
    )
    projects: List[Dict[str, Any]] = proj_res.data or []
    if not projects:
        return {"projects": []}

    ids = [p["id"] for p in projects]

    # 2) best match per project: latest run_at then smallest rank
    mr_res = (
        supabase.table("match_results")
        .select(
            "project_id, program_name, run_at, rank, score_final_cal, score_final_raw, score_rule, score_content, score_goal"
        )
        .in_("project_id", ids)
        .order("run_at", desc=True)
        .order("rank", desc=False)
        .execute()
    )
    mrs: List[Dict[str, Any]] = mr_res.data or []

    best: Dict[str, Dict[str, Any]] = {}
    for row in mrs:
        pid = row["project_id"]
        if pid not in best:
            best[pid] = row  # first seen is best (because of ordering)

    out: List[Dict[str, Any]] = []
    for p in projects:
        b = best.get(p["id"])
        score = None
        if b:
            if b.get("score_final_cal") is not None:
                score = round(float(b["score_final_cal"]) * 100)
            elif b.get("score_final_raw") is not None:
                score = round(float(b["score_final_raw"]) * 100)
            else:
                parts = [b.get("score_rule"), b.get("score_content"), b.get("score_goal")]
                vals = [float(x) for x in parts if x is not None]
                score = round(sum(vals) / len(vals) * 100) if vals else None

        last_message = f"أفضل مطابقة: {b['program_name']}" if b and b.get("program_name") else None

        out.append(
            {
                "id": p["id"],
                "name": p["name"],
                "updated_at": p.get("updated_at"),
                "score": score,
                "last_message": last_message,
            }
        )

    return {"projects": out}

@app.patch("/projects/{project_id}")
async def rename_project(
    project_id: str, payload: ProjectUpdate, current_user: int = Depends(get_current_user)
):
    # ensure ownership
    own = (
        supabase.table("projects")
        .select("id, slug, user_id")
        .eq("id", project_id)
        .limit(1)
        .execute()
    )
    if not own.data:
        raise HTTPException(status_code=404, detail="Project not found")
    if own.data[0]["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Forbidden")

    base = slugify(payload.name)
    slug = base
    suffix = 2
    while True:
        exists = (
            supabase.table("projects")
            .select("id")
            .eq("slug", slug)
            .neq("id", project_id)
            .limit(1)
            .execute()
        )
        if not exists.data:
            break
        slug = f"{base}-{suffix}"
        suffix += 1

    res = (
        supabase.table("projects")
        .update({"name": payload.name, "slug": slug, "updated_at": datetime.utcnow().isoformat()})
        .eq("id", project_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=400, detail="Update failed")
    return {"project": res.data[0]}

# ---------- Get a single project (ownership check) ----------
@app.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: int = Depends(get_current_user)):
    res = (
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = res.data[0]
    if proj["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"project": proj}

# ---------- Get latest matches for a project ----------
@app.get("/projects/{project_id}/matches")
# Latest run's matches, full columns
@app.get("/projects/{project_id}/matches")
async def project_matches(
    project_id: str,
    limit: int = 10,
    current_user: int = Depends(get_current_user),
):
    # ensure ownership
    own = (
        supabase.table("projects")
        .select("id, user_id")
        .eq("id", project_id)
        .limit(1)
        .execute()
    )
    if not own.data:
        raise HTTPException(status_code=404, detail="Project not found")
    if own.data[0]["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Forbidden")

    # latest run_at for this project
    latest = (
        supabase.table("match_results")
        .select("run_at")
        .eq("project_id", project_id)
        .order("run_at", desc=True)
        .limit(1)
        .execute()
    )
    if not latest.data:
        return {"matches": []}
    last_run = latest.data[0]["run_at"]

    rows = (
        supabase.table("match_results")
        .select(
            "program_id, program_name, source_url, rank, run_at, "
            "score_rule, score_content, score_goal, score_final_raw, score_final_cal, raw_distance, "
            "subs_sector, subs_stage, subs_funding, "
            "reasons, improvements, evidence_project, evidence_program"
        )
        .eq("project_id", project_id)
        .eq("run_at", last_run)
        .order("rank", desc=False)
        .limit(limit)
        .execute()
    )

    return {"matches": rows.data or []}


@app.get("/debug/chroma")
def debug_chroma():
    try:
        # Works with langchain_chroma.Chroma
        info = {}
        col = getattr(VDB, "_collection", None)
        if col is None:
            return {"ok": False, "error": "No underlying Chroma collection on VDB"}
        try:
            count = col.count()
        except Exception as e:
            count = f"count() error: {e}"
        info["collection_name"] = getattr(VDB, "collection_name", None)
        info["persist_directory"] = getattr(VDB, "persist_directory", None)
        info["count"] = count
        return {"ok": True, "info": info}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/debug/try_retrieve/{project_id}")
def debug_try_retrieve(project_id: str):
    # Quick and dirty: fetch the project, normalize minimal text, call retrieve only
    res = (
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")

    proj = res.data[0]
    user_project = {
        "name": proj.get("name") or "",
        "description": proj.get("description") or "",
        "sectors": proj.get("sectors") or [],
        "stage": proj.get("stage") or "",
        "funding_need": float(proj.get("funding_need") or 0.0),
        "goals": proj.get("goals") or [],
    }

    try:
        cands = retrieve_candidates(VDB, user_project, k=10)
        # Return only light metadata so the JSON isn't huge
        brief = []
        for c in cands[:5]:
            md = getattr(c["doc"], "metadata", {}) or {}
            brief.append({
                "program_name": md.get("name") or md.get("title"),
                "program_id": md.get("id") or md.get("slug"),
                "source": md.get("source") or md.get("source_path"),
            })
        return {"ok": True, "candidate_count": len(cands), "sample": brief}
    except Exception as e:
        return {"ok": False, "error": str(e)}
