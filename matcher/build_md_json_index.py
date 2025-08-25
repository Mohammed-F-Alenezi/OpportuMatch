# build_md_json_index.py
import os, json, pathlib, re
from typing import Dict, Any
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata
from .extractor import run as extract_program  # <-- uses the robust extractor above

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
MD_DIR = ROOT / "data"
OUT_DIR = ROOT / "data" / "programs"
PERSIST_DIR = os.getenv("PERSIST_DIR", "chroma_rag")
COLLECTION  = os.getenv("COLLECTION", "programs_index")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")

for cand in (ROOT / ".env", HERE / ".env"):
    if cand.exists():
        load_dotenv(dotenv_path=str(cand), override=False); break

def make_unique_slug(base: str, taken: set[str]) -> str:
    slug = base; n = 2
    while (OUT_DIR / f"{slug}.json").exists() or slug in taken:
        slug = f"{base}-{n}"; n += 1
    taken.add(slug)
    return slug

def md_to_json():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    converted, seen = [], set()
    md_files = sorted(MD_DIR.glob("*.md"))
    if not md_files:
        raise SystemExit(f"No Markdown files found in {MD_DIR.resolve()}")

    for md_path in md_files:
        md = md_path.read_text(encoding="utf-8", errors="ignore")
        data: Dict[str, Any] = extract_program(md, notes="")  # LLM + fallback
        # id normalization + de-dupe across run
        slug = data.get("id") or "program"
        slug = re.sub(r"[^0-9A-Za-z\u0600-\u06FF-]+", "-", slug).strip("-").lower() or "program"
        slug = make_unique_slug(slug, seen)

        data["id"] = slug
        data["source_path"] = md_path.as_posix()

        out_path = OUT_DIR / f"{slug}.json"
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        converted.append(out_path.name)

    print("OK:", len(converted), "files saved to", OUT_DIR.as_posix())

def json_to_chroma():
    json_files = sorted(OUT_DIR.glob("*.json"))
    if not json_files:
        raise SystemExit(f"No JSON files found under {OUT_DIR.resolve()} — run MD step first.")

    docs = []
    for fp in json_files:
        p = json.loads(fp.read_text(encoding="utf-8"))
        index_text = "\n".join([
            p.get("name","") or "",
            p.get("description","") or "",
            p.get("objectives","") or p.get("objectives_text","") or "",
            "Goals "       + ", ".join(p.get("goals", []) or []),
            "Features "    + ", ".join(p.get("features", []) or []),
            "Eligibility " + ", ".join(p.get("eligibility_must", []) or []),
            "Sectors "     + ", ".join(p.get("sector_tags", []) or []),
            "Stages "      + ", ".join(p.get("stage_tags", []) or []),
        ]).strip()

        doc = Document(page_content=index_text, metadata=p)
        doc = filter_complex_metadata([doc])[0]
        docs.append(doc)

    print(f"Loaded {len(docs)} program docs from {OUT_DIR.as_posix()}")

    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is missing in your .env")

    embeddings = OpenAIEmbeddings(model=EMBED_MODEL)
    Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        collection_name=COLLECTION,
        persist_directory=PERSIST_DIR,
        collection_metadata={"hnsw:space": "cosine"},
    )
    print(f"✅ Chroma index ready → collection='{COLLECTION}', persist='{PERSIST_DIR}'")

if __name__ == "__main__":
    md_to_json()
    json_to_chroma()
