# chatbot/services/helpers.py

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
    # allow %xx once, repeated pairs, etc.
    pattern = r'http[s]?://(?:[a-zA-Z0-9]|[$\-_.+!*\'(),]|%[0-9a-fA-F]{2})+'
    return re.findall(pattern, context or "")

def determine_tech_depth(question: str, context: str) -> bool:
    indicators = [
        "technical", "code", "implementation", "architecture", "system design",
        "database", "api", "infrastructure", "deployment", "tech stack",
    ]
    q = (question or "").lower()
    c = (context or "").lower()
    return any(tok in q or tok in c for tok in indicators)
