# from typing import Dict, Any, List, Tuple
# from langchain_core.documents import Document

# def build_query_text(project: Dict[str, Any]) -> str:
#     name = (project.get("name") or "").strip()
#     desc = (project.get("description") or "").strip()
#     sectors = ", ".join(project.get("sectors") or [])
#     stage = (project.get("stage") or "")
#     funding = str(project.get("funding_need") or "")
#     goals = ", ".join(project.get("goals") or [])
#     return f"{name}\n{desc}\nSectors: {sectors}\nStage: {stage}\nFundingNeed:{funding}\nGoals:{goals}"

# def retrieve_candidates(vectordb, user_project: Dict[str, Any], k: int) -> List[Tuple[Document, float]]:
#     query = build_query_text(user_project)
#     return vectordb.similarity_search_with_score(query, k=k)  # (doc, distance)



# retrieval.py
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

def _normalize_candidates(raw: List[Any]) -> List[Tuple[Document, float]]:
    """Force shape to [(Document, float)] and drop weird items."""
    norm: List[Tuple[Document, float]] = []
    for i, item in enumerate(raw):
        # دعم أشكال مختلفة: (doc, score), (doc, score, ..), doc فقط
        if isinstance(item, tuple):
            if len(item) >= 2:
                doc, score = item[0], item[1]
            else:
                continue
        else:
            doc, score = item, 1.0  # أسوأ حالة: اعتبر التشابه ضعيف
        try:
            score = float(score)
        except Exception:
            continue
        # تحصين: لازم يكون Document
        if not isinstance(doc, Document):
            continue
        norm.append((doc, score))
    return norm

def retrieve_candidates(vectordb, user_project: Dict[str, Any], k: int) -> List[Tuple[Document, float]]:
    query = build_query_text(user_project)
    raw = vectordb.similarity_search_with_score(query, k=k)
    cands = _normalize_candidates(raw)

    # DEBUG (مفيد جدًا أثناء الاختبار)
    try:
        dists = [float(d) for (_doc, d) in cands]
        mn = min(dists) if dists else None
        av = (sum(dists)/len(dists)) if dists else None
        mx = max(dists) if dists else None
        print(f"[RETRIEVAL] got={len(cands)} dists(min/avg/max)=({mn}/{av}/{mx})")
    except Exception as e:
        print(f"[RETRIEVAL] stats-error: {e}")

    return cands  # (doc, distance)
