import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from supabase import Client, create_client

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

@app.post("/projects")
async def create_project(p: ProjectIn, current_user: int = Depends(get_current_user)):
    stage_db = normalize_stage(p.stage)
    if stage_db not in DB_STAGES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid 'stage' value. Allowed: {', '.join(DB_STAGES)}",
        )

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
        res = supabase.table("projects").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to insert project")
        return {"project": res.data[0]}
    except Exception as e:
        # return readable DB error (instead of generic 500)
        raise HTTPException(status_code=400, detail=str(e))

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
