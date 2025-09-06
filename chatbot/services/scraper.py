# chatbot/services/scraper.py
import logging, requests
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import SeleniumURLLoader

from chatbot.services.state import split_text, add_documents, STATE

log = logging.getLogger(__name__)

def is_valid_url(url: str) -> bool:
    try:
        r = urlparse(url)
        return bool(r.scheme and r.netloc)
    except Exception:
        return False

def load_page_selenium(url: str) -> List[Document]:
    loader = SeleniumURLLoader(urls=[url])
    docs = loader.load()
    return [Document(page_content=d.page_content, metadata=d.metadata) for d in docs]

def load_page_requests(url: str) -> List[Document]:
    r = requests.get(url, timeout=25, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.extract()
    text = " ".join(soup.get_text(separator=" ").split())
    return [Document(page_content=text, metadata={"source": url, "loader": "requests"})]

def load_and_index_url(mrid: str, url: str) -> int:
    if not is_valid_url(url):
        raise ValueError("Invalid URL")
    try:
        docs = load_page_selenium(url)
        if not docs or not docs[0].page_content.strip():
            raise ValueError("Empty content via Selenium")
    except Exception as e:
        log.warning(f"Selenium load failed: {e}. Falling back to requests/bs4")
        docs = load_page_requests(url)
    chunks = split_text(docs)
    add_documents(mrid, chunks)
    STATE[mrid]["current_url"] = url
    return len(chunks)
