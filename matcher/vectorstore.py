from typing import Any
from pathlib import Path
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from .config import PERSIST_DIR, COLLECTION, EMBED_MODEL

def get_embeddings():
    return OpenAIEmbeddings(model=EMBED_MODEL)

def get_vectordb() -> Any:
    Path(PERSIST_DIR).mkdir(parents=True, exist_ok=True)
    db = Chroma(
        collection_name=COLLECTION,
        persist_directory=PERSIST_DIR,
        embedding_function=get_embeddings(),
    )
    try:
        n = db._collection.count()
        print(f"[DEBUG] Chroma: collection='{COLLECTION}' in '{PERSIST_DIR}' has {n} docs")
    except Exception as e:
        print(f"[DEBUG] Chroma count failed: {e}")
    return db
