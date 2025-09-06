import os


from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # repo root
PERSIST_DIR = os.getenv("PERSIST_DIR") or str(ROOT / "chroma_rag")
COLLECTION  = os.getenv("COLLECTION", "programs_index")
DATA_PATH   = os.getenv("DATA_PATH") or str(ROOT / "data" / "programs")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
PROJECTS_TABLE = os.getenv("PROJECTS_TABLE", "projects")
MATCH_TABLE    = os.getenv("MATCH_TABLE", "match_results")

TOP_K_DEFAULT = int(os.getenv("TOP_K_DEFAULT", "10"))
SEED_DEFAULT  = int(os.getenv("SEED_DEFAULT", "42"))

# DO NOT CHANGE (per your scoring spec)
WEIGHTS = (0.45, 0.35, 0.20)

CALIBRATION = os.getenv("CALIBRATION", "relative_minmax")
if CALIBRATION == "":
    CALIBRATION = None
