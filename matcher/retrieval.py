from typing import Dict, Any, List, Tuple
from langchain_core.documents import Document

def build_query_text(project: Dict[str, Any]) -> str:
    name = (project.get("name") or "").strip()
    desc = (project.get("description") or "").strip()
    sectors = ", ".join(project.get("sectors") or [])
    stage = (project.get("stage") or "")
    funding = str(project.get("funding_need") or "")
    goals = ", ".join(project.get("goals") or [])
    return f"{name}\n{desc}\nSectors: {sectors}\nStage: {stage}\nFundingNeed:{funding}\nGoals:{goals}"

def retrieve_candidates(vectordb, user_project: Dict[str, Any], k: int) -> List[Tuple[Document, float]]:
    query = build_query_text(user_project)
    return vectordb.similarity_search_with_score(query, k=k)  # (doc, distance)
