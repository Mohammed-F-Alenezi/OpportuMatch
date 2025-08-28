# chatbot/config.py
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

load_dotenv()

def get_models(temperature: float, chat_model: str, embed_model: str):
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    chat_llm = ChatOpenAI(model=chat_model, temperature=temperature, api_key=api_key)
    embeddings = OpenAIEmbeddings(model=embed_model, api_key=api_key)
    return chat_llm, embeddings

def default_chat_model() -> str:
    return os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")

def default_embed_model() -> str:
    return os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

def default_temperature() -> float:
    try:
        return float(os.getenv("TEMPERATURE", "0.6"))
    except Exception:
        return 0.6
