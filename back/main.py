# back/main.py
# --------------------------------------------------------------------------------------
# ONE FastAPI app: Auth + Projects + mounts RAG router from chatbot/*
# With defensive try/except around all critical init steps for clearer error reporting.
# --------------------------------------------------------------------------------------
import os
import re
import sys
import pathlib
import logging
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

# --------------------------------------------------------------------------------------
# Logging setup (early)
# --------------------------------------------------------------------------------------
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger("main")

def _exc_str(e: BaseException) -> str:
    return f"{e.__class__.__name__}: {e}\n{traceback.format_exc()}"

# --------------------------------------------------------------------------------------
# Load environment
# --------------------------------------------------------------------------------------
try:
    # lazy import to avoid failing hard if dotenv is missing
    from dotenv import load_dotenv
    load_dotenv()
    log.info("Environment loaded via python-dotenv.")
except Exception as e:
    log.warning("Failed to load .env via python-dotenv; continuing. Details:\n%s", _exc_str(e))

# --------------------------------------------------------------------------------------
# Make sibling `chatbot/` importable (project root is parent of back/)
# --------------------------------------------------------------------------------------
try:
    ROOT = pathlib.Path(__file__).resolve().parent.parent  # project root (parent of back/)
    if str(ROOT) not in sys.path:
        sys.path.append(str(ROOT))
    log.info("Added project root to sys.path: %s", ROOT)
except Exception as e:
    log.error("Failed to adjust sys.path. Details:\n%s", _exc_str(e))
    raise

# --------------------------------------------------------------------------------------
# Supabase client init (fail-fast with clear message)
# --------------------------------------------------------------------------------------
try:
    from supabase import Client, create_client
except Exception as e:
    log.error("Supabase SDK import failed. Did you install `supabase`? Details:\n%s", _exc_str(e))
    raise

try:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL/SUPABASE_KEY are required (check your env).")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info("Supabase client initialized.")
except Exception as e:
    log.critical("Failed to initialize Supabase client. Details:\n%s", _exc_str(e))
    raise

# --------------------------------------------------------------------------------------
# Create FastAPI app & CORS (pass class, not instance)
# --------------------------------------------------------------------------------------
try:
    app = FastAPI(title="Backend + RAG")
    allow_origins_env = os.getenv("CORS_ALLOW_ORIGINS", "*")
    allow_origins = [o.strip() for o in allow_origins_env.split(",")] if allow_origins_env else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    log.info("FastAPI app created. CORS origins: %s", allow_origins)
except Exception as e:
    log.critical("Failed to create app or add CORS middleware. Details:\n%s", _exc_str(e))
    raise

# --------------------------------------------------------------------------------------
# Import and mount RAG router
# --------------------------------------------------------------------------------------
try:
    from chatbot.routers.rag import router as rag_router
    app.include_router(rag_router)
    log.info("Mounted RAG router at /rag/* (plus back-compat routes).")
except Exception as e:
    log.critical("Failed to import/mount chatbot.routers.rag. Check package files & __init__.py. Details:\n%s", _exc_str(e))
    raise

# --------------------------------------------------------------------------------------
# Health endpoint
# --------------------------------------------------------------------------------------
@app.get("/health")
def health():
    try:
        # quick sanity (optional: ping supabase by a trivial call)
        return {"ok": True}
    except Exception as e:
        log.error("Health check failed:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Unhealthy")

# --------------------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------------------
SECRET_KEY = os.getenv("JWT_SECRET", "1234")  # TODO: set in env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    try:
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    except Exception as e:
        log.error("create_access_token failed:\n%s", _exc_str(e))
        raise

@app.post("/register")
async def register_user(request: Request):
    try:
        data = await request.json()
        data.pop("id", None)
        res = supabase.table("users").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to insert user")
        return {"message": "User registered successfully", "data": res.data}
    except HTTPException:
        raise
    except Exception as e:
        log.error("Register error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Internal error during register")

@app.post("/login")
async def login_user(request: Request):
    try:
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
            {"sub": str(user["id"])},
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        log.error("Login error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Internal error during login")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(user_id)
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        log.error("get_current_user error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Auth failure")

# --------------------------------------------------------------------------------------
# Models / helpers (Projects)
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
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^\w\-]+", "", s)
    return s or "project"

DB_STAGES = {"فكرة", "MVP", "إطلاق", "تشغيل", "نمو مبكر", "نمو", "توسع"}
STAGE_ALIASES = {
    "idea": "فكرة", "ideation": "فكرة",
    "prototype": "MVP", "mvp": "MVP",
    "launch": "إطلاق", "release": "إطلاق",
    "go-live": "تشغيل", "operate": "تشغيل", "production": "تشغيل",
    "early_growth": "نمو مبكر", "earlygrowth": "نمو مبكر",
    "growth": "نمو", "scale": "توسع", "expansion": "توسع", "scaleup": "توسع",
    "اطلاق": "إطلاق", "تشغيل": "تشغيل",
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
# Project APIs (with error logging)
# --------------------------------------------------------------------------------------
@app.get("/users/me/projects")
async def get_my_projects(current_user: int = Depends(get_current_user)):
    try:
        res = (
            supabase.table("projects")
            .select("*")
            .eq("user_id", current_user)
            .order("updated_at", desc=True)
            .execute()
        )
        return {"projects": res.data or []}
    except Exception as e:
        log.error("get_my_projects error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch projects")

@app.post("/projects")
async def create_project(p: ProjectIn, current_user: int = Depends(get_current_user)):
    try:
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

        res = supabase.table("projects").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to insert project")
        return {"project": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        log.error("create_project error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Failed to create project")

@app.get("/projects/summary")
async def projects_summary(current_user: int = Depends(get_current_user)):
    try:
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
        mr_res = (
            supabase.table("match_results")
            .select(
                "project_id, program_name, run_at, rank, "
                "score_final_cal, score_final_raw, score_rule, score_content, score_goal"
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
                best[pid] = row

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

            out.append(
                {
                    "id": p["id"],
                    "name": p["name"],
                    "updated_at": p.get("updated_at"),
                    "score": score,
                    "last_message": (f"أفضل مطابقة: {b['program_name']}" if b and b.get("program_name") else None),
                }
            )
        return {"projects": out}
    except Exception as e:
        log.error("projects_summary error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Failed to compute summary")

@app.patch("/projects/{project_id}")
async def rename_project(
    project_id: str, payload: ProjectUpdate, current_user: int = Depends(get_current_user)
):
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        log.error("rename_project error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Failed to rename project")

@app.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: int = Depends(get_current_user)):
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        log.error("get_project error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Failed to get project")

@app.get("/projects/{project_id}/matches")
async def project_matches(
    project_id: str,
    limit: int = 10,
    current_user: int = Depends(get_current_user),
):
    try:
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
                "id, project_id, "
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
    except HTTPException:
        raise
    except Exception as e:
        log.error("project_matches error:\n%s", _exc_str(e))
        raise HTTPException(status_code=500, detail="Failed to get matches")

# --------------------------------------------------------------------------------------
# App startup/shutdown hooks (extra diagnostics)
# --------------------------------------------------------------------------------------
@app.on_event("startup")
async def _on_startup():
    try:
        log.info("Starting the application...")
        # (Optional) ping a trivial table if you want to verify DB connectivity here
        # supabase.table("health_check").select("id").limit(1).execute()
    except Exception as e:
        log.error("Startup hook error:\n%s", _exc_str(e))

@app.on_event("shutdown")
async def _on_shutdown():
    try:
        log.info("Shutting down application.")
    except Exception as e:
        log.error(f"retrieve_context failed: {e}")
        return ""

def safe_invoke(runnable, inputs: dict, max_retries: int = 3) -> str:
    last_err = None
    for i in range(max_retries):
        try:
            out = runnable.invoke(inputs)
            return out.content.strip() if hasattr(out, "content") else str(out).strip()
        except Exception as e:
            last_err = e
            log.warning(f"invoke attempt {i+1} failed: {e}")
    return f"Error: Could not generate response. Details: {last_err}"

# --- DB helpers for RAG ---
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

# ---------- RAG Schemas ----------
class RagInitIn(BaseModel):
    match_result_id: str
    idea_description: Optional[str] = None

class RagChatIn(BaseModel):
    match_result_id: str
    message: str
    idea_description: Optional[str] = None
    tech_depth: Optional[bool] = False  # NEW: force including Tech Plan

class RagSummaryIn(BaseModel):
    match_result_id: str

class RagTestIn(BaseModel):
    match_result_id: Optional[str] = None
    write: bool = False

# ---------- RAG Endpoints (canonical under /rag/*) ----------
@app.post("/rag/init")
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

@app.post("/rag/chat")
def rag_chat(payload: RagChatIn):
    mrid = payload.match_result_id.strip()
    text = (payload.message or "").strip()
    if not mrid or not text:
        raise HTTPException(400, "match_result_id and message required")
    ensure_defaults(mrid)

    chat_llm, _ = get_models(STATE[mrid]["temperature"], STATE[mrid]["chat_model"], STATE[mrid]["embed_model"])
    chat_chain       = make_chain(CHAT_TEMPLATE, chat_llm)
    translator_chain = make_chain(TRANSLATE_TEMPLATE, chat_llm)

    web_ctx = retrieve_context(mrid, text, k=6) if STATE[mrid].get("doc_count", 0) > 0 else ""
    dbb     = STATE[mrid].get("db_bundle") or {}

    def build_db_context(b: Dict[str, Any], user_desc: str) -> str:
        parts = []
        desc = (user_desc or "").strip() or (b.get("description") or "").strip()
        if desc: parts.append(f"PROJECT_DESCRIPTION:\n{desc}")
        if b.get("improvement"): parts.append("IMPROVEMENT_JSONB:\n" + json.dumps(b.get("improvement"), ensure_ascii=False)[:1200])
        if b.get("reason"):      parts.append("REASON_JSONB:\n" + json.dumps(b.get("reason"), ensure_ascii=False)[:1200])
        return "\n\n".join(parts)

    db_ctx = build_db_context(dbb, payload.idea_description or "")
    merged = "\n\n".join([p for p in [("[WEB_CONTEXT]\n"+web_ctx) if web_ctx else "", ("[DB_CONTEXT]\n"+db_ctx) if db_ctx else ""] if p])

    target_lang = target_lang_for(text)
    STATE[mrid]["messages"].append({"role":"user","content":text})

    if not merged.strip():
        reply = "ما عندي سياق — ابدأ من Match Result أولاً." if target_lang=="Arabic" \
                else "I don't know—no context loaded. Initialize from Match Result first."
    else:
        reply = safe_invoke(chat_chain, {
            "question": text,
            "context": merged,
            "language_policy": LANGUAGE_POLICY.format(target_lang=target_lang),
            "target_lang": target_lang,
            "system_role": BUSINESS_DEV_SYSTEM_ROLE,
            "tech_depth": "true" if (payload.tech_depth or False) else "false",
        })
        # light language enforcement
        if target_lang == "Arabic" and not re.search(r"[\u0600-\u06FF]", reply):
            reply = safe_invoke(
                translator_chain,
                {
                    "text": reply,
                    "target_lang": target_lang,
                    "language_policy": LANGUAGE_POLICY.format(target_lang=target_lang),
                },
            )

    STATE[mrid]["messages"].append({"role":"assistant","content":reply})

    try:
        save_chat_turn(mrid, "user", text, dbb)
        save_chat_turn(mrid, "assistant", reply, dbb)
    except Exception as e:
        log.warning(f"persist chat failed: {e}")

    citations: List[str] = []
    if STATE[mrid].get("current_url"): citations.append(STATE[mrid]["current_url"])
    if dbb.get("improvement"): citations.append("DB: improvements")
    if dbb.get("reason"):      citations.append("DB: reasons")

    return {"reply": reply, "citations": citations}

@app.post("/rag/summary")
def rag_summary(payload: RagSummaryIn):
    mrid = payload.match_result_id.strip()
    if not mrid:
        raise HTTPException(400, "match_result_id required")
    ensure_defaults(mrid)

    chat_llm, _ = get_models(0.2, STATE[mrid]["chat_model"], STATE[mrid]["embed_model"])
    # compact recent messages for summary
    chat_lines = []
    for m in STATE[mrid]["messages"][-20:]:
        role = m.get("role","user")
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
    summary = safe_invoke(chain, {
        "chat_log": chat_log,
        "language_policy": LANGUAGE_POLICY.format(target_lang=target_lang_for(chat_log)),
        "target_lang": target_lang_for(chat_log),
    })
    try:
        save_summary(mrid, summary)
    except Exception as e:
        log.warning(f"save summary failed: {e}")

    return {"summary": summary}

@app.post("/rag/test-supabase")
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
                pr = supabase.table("projects").select("description").eq("id", row["project_id"]).limit(1).execute()
                prow = (pr.data or [None])[0]
                res["read_project_description"] = bool(prow and (prow.get("description") is not None))
        if payload.write and payload.match_result_id:
            b = fetch_chat_bundle(payload.match_result_id.strip())
            upsert_chatbot_seed(payload.match_result_id.strip(), b, b.get("description",""))
            res["write_chatbot"] = True
    except Exception as e:
        res["connected"] = False
        res["errors"].append(str(e))
    return res

# ---------- Back-compat shims (so old frontend calling /init, /chat, /summary still works) ----------
@app.post("/init")
def _compat_init(payload: RagInitIn):
    return rag_init(payload)

@app.post("/chat")
def _compat_chat(payload: RagChatIn):
    return rag_chat(payload)

@app.post("/summary")
def _compat_summary(payload: RagSummaryIn):
    return rag_summary(payload)

@app.post("/test-supabase")
def _compat_test(payload: RagTestIn):
    return rag_test(payload)