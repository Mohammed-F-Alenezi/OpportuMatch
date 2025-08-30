QUERY_CLASSIFIERS = {
    "strategic": ["business model", "strategy", "market", "competitive", "positioning"],
    "technical": ["architecture", "code", "system", "database", "API", "implementation"],
    "financial": ["funding", "revenue", "cost", "projection", "ROI", "budget"],
    "program": ["program", "initiative", "application", "requirements", "eligibility"],
    "general": ["advice", "help", "guidance", "recommendation", "next steps"],
}

def classify_query(question: str) -> str:
    q = (question or "").lower()
    for category, keywords in QUERY_CLASSIFIERS.items():
        if any(k.lower() in q for k in keywords):
            return category
    return "general"

def extract_urls_from_context(context: str) -> list[str]:
    import re
    pattern = r'http[s]?://(?:[a-zA-Z0-9]|[$\-_.+!*\'(),]|%[0-9a-fA-F]{2})+'
    return re.findall(pattern, context or "")

def determine_tech_depth(question: str, context: str) -> bool:
    indicators = [
        "technical", "code", "implementation", "architecture", "system design",
        "database", "api", "infrastructure", "deployment", "tech stack",
        # Arabic hints
        "تقني", "الشيفرة", "تنفيذ", "معمارية", "قاعدة البيانات", "واجهة برمجة تطبيقات",
    ]
    q = (question or "").lower()
    c = (context or "").lower()
    return any(tok in q or tok in c for tok in indicators)

# ---- NEW: intent helpers so DB description wins when appropriate ----

_PROJECT_SELF_HINTS = [
    "my project", "our project", "my idea", "our idea", "project description", "idea description",
    # Arabic
    "مشروعي", "مشروعنا", "فكرتي", "فكرتنا", "وصف المشروع", "وصف فكرتي", "وصف الفكرة",
]

_DESC_REQUEST_HINTS = [
    "what is my description", "show my description", "give me my description",
    # Arabic
    "ما هو الوصف", "اعرض الوصف", "هات الوصف", "وصف مشروعي", "أعطني الوصف",
]

def is_project_self_query(text: str) -> bool:
    t = (text or "").lower()
    return any(h in t for h in _PROJECT_SELF_HINTS)

def is_project_description_request(text: str) -> bool:
    t = (text or "").lower()
    return any(h in t for h in _DESC_REQUEST_HINTS)
