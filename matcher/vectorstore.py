from typing import Any
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from .config import PERSIST_DIR, COLLECTION, EMBED_MODEL

def get_embeddings():
    return OpenAIEmbeddings(model=EMBED_MODEL)

def get_vectordb() -> Any:
    return Chroma(
        collection_name=COLLECTION,
        persist_directory=PERSIST_DIR,
        embedding_function=get_embeddings(),
    )
