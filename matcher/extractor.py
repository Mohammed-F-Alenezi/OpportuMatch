# extractor.py
from __future__ import annotations
import re, json, unicodedata
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# ---------------- Program schema (matches your downstream keys) ----------------
class ProgramSchema(BaseModel):
    id: str
    name: str
    description: str = ""                         # may be long (from MD)
    objectives: str = ""                          # short textual summary
    goals: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    eligibility_must: List[str] = Field(default_factory=list)
    sector_tags: List[str] = Field(default_factory=list)
    stage_tags: List[str] = Field(default_factory=list)
    url: Optional[str] = None
    source_path: Optional[str] = None
    last_updated: Optional[str] = None
    launch_date: Optional[str] = None
    funding_type: Optional[str] = None            # grant | loan | equity | in-kind
    funding_min: Optional[float] = 0.0
    funding_max: Optional[float] = 0.0
    program_type: Optional[str] = None            # "مبادرة/تمكين" | "برنامج"
    objectives_text: Optional[str] = None

# ---------------- Arabic system instructions (yours) ----------------
SYSTEM_INSTRUCTIONS = """
أنت محلّل يَستخرج حقولًا منظّمة من Markdown عربي يصف برنامج دعم/مبادرة.
أعد المخرجات وفق الـSchema بدقة، دون نص إضافي خارج JSON.

المتطلبات:
- استنبط id كـ slug لاتيني من name (بدون مسافات/تشكيل).
- last_updated: إن وجدت صيغة مثل "2025-08-15 14:21" حوّلها ISO8601 "2025-08-15T14:21:00".
- launch_date: إذا كان "مارس 2025" حوّله إلى "2025-03". إن تعذّر، أعد YYYY فقط.
- funding_type: اختر واحدة فقط من: grant, loan, equity, in-kind. إن لم توجد مبالغ نقدية واضحة، استخدم in-kind.
- funding_min/max: إن لم تتوافر أرقام، اجعلها 0.
- نظّف التكرارات في القوائم (steps/features/...).
- sector_tags: رشّح كلمات مثل ['الصحة','تقنية صحية','صيدليات','تحول رقمي','وصفتي/سلاسل إمداد'] بما يناسب النص.
- stage_tags: اختر من ['فكرة','MVP','إطلاق','تشغيل','نمو مبكر','نمو','توسع'] بحسب دلالات النص.
- program_type: إن احتوى العنوان على "مبادرة" فأعد "مبادرة/تمكين" وإلا "برنامج".
- objectives_text: لخص الأهداف في سطر/سطرين أو استخدم الأهداف نفسها منسّقة.
- التزم بالمصدر فقط، لا تُضِف معلومات من خارج النص.
- إن تعذّر إيجاد أي حقل، لا تتركه فارغًا: استنبط وصفًا موجزًا من الفقرات الأولى، واستخرج الأهداف من البنود أو الجُمل المفتاحية.
"""

PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_INSTRUCTIONS),
    ("user", "المصدر (Markdown):\n\n{markdown}\n\nملاحظات إضافية: {notes}")
])

# ---------------- helpers for fallback parsing ----------------
HEADING_PAT = re.compile(r"^\s{0,3}#{1,6}\s+(?P<txt>.+)$", re.MULTILINE)
URL_PAT = re.compile(r"https?://\S+")
BULLET_PAT = re.compile(r"^\s*[-*•▪︎+]\s+(?P<txt>.+)$", re.MULTILINE)
FIELD_LINE_PAT = re.compile(r"(?i)^(?:الأهداف|Goals|Objectives|الميزات|Features|Eligibility|الأهلية)\s*[:：-]\s*(?P<txt>.+)$")

def _slug_ar_lat(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = s.strip().lower()
    s = re.sub(r"[^\w\u0600-\u06FF-]+", "-", s)   # keep arabic letters
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "program"

def _first_heading(md: str) -> Optional[str]:
    m = HEADING_PAT.search(md)
    return m.group("txt").strip() if m else None

def _first_url(md: str) -> Optional[str]:
    m = URL_PAT.search(md)
    return m.group(0) if m else None

def _first_paragraph(md: str) -> str:
    # take first non-empty paragraph not starting with heading/bullet
    for para in re.split(r"\n\s*\n", md.strip()):
        if not para.strip():
            continue
        if HEADING_PAT.match(para) or BULLET_PAT.match(para):
            continue
        return para.strip()
    # fallback: first 400 chars
    return md.strip()[:400]

def _collect_bullets(md: str) -> List[str]:
    return [m.group("txt").strip() for m in BULLET_PAT.finditer(md)]

def _collect_field_lines(md: str) -> List[str]:
    return [m.group("txt").strip() for m in FIELD_LINE_PAT.finditer(md)]

def _dedup_keep_order(items: List[str]) -> List[str]:
    seen, out = set(), []
    for x in items:
        key = x.strip()
        if key and key not in seen:
            out.append(key); seen.add(key)
    return out

def _fallback_enrich(data: Dict[str, Any], md: str) -> Dict[str, Any]:
    # name
    if not data.get("name"):
        data["name"] = _first_heading(md) or "برنامج"
    # description
    if not data.get("description"):
        data["description"] = _first_paragraph(md)
    # url
    if not data.get("url"):
        data["url"] = _first_url(md)

    # goals: prefer bullets or "Goals:" lines
    if not data.get("goals"):
        bullets = _collect_bullets(md) or _collect_field_lines(md)
        data["goals"] = _dedup_keep_order(bullets[:8])  # cap

    # features/eligibility: mine from bullets too if empty
    if not data.get("features"):
        data["features"] = _dedup_keep_order(data.get("features", []) + _collect_field_lines(md))[:8]
    if not data.get("eligibility_must"):
        elig_lines = [x for x in _collect_field_lines(md) if "شروط" in x or "Eligible" in x or "الأهلية" in x]
        data["eligibility_must"] = _dedup_keep_order(elig_lines[:8])

    # sector/stage tags: quick heuristics if missing
    if not data.get("sector_tags"):
        sec = []
        txt = md.lower()
        if any(k in txt for k in ["health", "الصحة", "تقنية صحية", "digital health"]): sec += ["الصحة","تقنية صحية"]
        if any(k in txt for k in ["commerce", "تجارة", "التجارة الإلكترونية"]): sec += ["التجارة الإلكترونية"]
        if any(k in txt for k in ["ai", "ذكاء اصطناعي"]): sec += ["ذكاء اصطناعي"]
        data["sector_tags"] = _dedup_keep_order(sec)
    if not data.get("stage_tags"):
        st = []
        txt = md
        if re.search(r"\bMVP\b|نموذج أولي|نموذج تجريبي", txt): st.append("MVP")
        if re.search(r"إطلاق|تدشين|launch", txt): st.append("إطلاق")
        if re.search(r"تشغيل|تشغيلي|production|go[- ]?live", txt): st.append("تشغيل")
        if re.search(r"نمو مبكر|early growth", txt): st.append("نمو مبكر")
        data["stage_tags"] = _dedup_keep_order(st)

    # objectives text: short summary
    if not data.get("objectives") and data.get("goals"):
        data["objectives"] = "؛ ".join(data["goals"][:3])

    # id / slug
    if not data.get("id") or str(data["id"]).lower() in {"", "none", "null"}:
        data["id"] = _slug_ar_lat(data.get("name", ""))

    # numeric defaults
    data["funding_min"] = float(data.get("funding_min") or 0)
    data["funding_max"] = float(data.get("funding_max") or 0)

    return data

# ---------------- public entrypoint ----------------
def run(markdown: str, notes: str = "") -> Dict[str, Any]:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, top_p=1, seed=42)
    structured_llm = llm.with_structured_output(ProgramSchema)
    prompt = PROMPT
    try:
        resp = structured_llm.invoke(prompt.format_messages(markdown=markdown, notes=notes))
        data = resp.dict()
    except Exception:
        # very rare; return minimal skeleton to be enriched by fallback
        data = ProgramSchema(id="program", name="برنامج").dict()

    # fallback enrichment for any empty fields
    data = _fallback_enrich(data, markdown)
    return data
