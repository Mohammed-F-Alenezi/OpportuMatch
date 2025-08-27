# llm.py
import os
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from dotenv import load_dotenv
from rag_index import search_programs, search_rules

# ========= إعداد المفتاح =========
load_dotenv()
_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GENMINI_API_KEY") or os.getenv("YOUR_API_KEY")
if not _API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set")
genai.configure(api_key=_API_KEY)

_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

_SYSTEM = """أنت "راشد" مساعد كشك ذكي في الهاكثون.
- تحدث بالعربية الفصحى بلطف وباختصار.
- لديك نمطان:
  (1) توصية مبادرة: استخرج 3 سمات على الأقل من وصف المستخدم (القطاع، المرحلة، نوع الدعم) واسأل سؤالاً واحداً إذا كانت المعلومات ناقصة. ثم رشّح مبادرة واحدة مع سبب موجز واختم بدعوة لزيارة "بوصلة منشآت".
  (2) لوائح الهاكثون: أجب بدقة استناداً إلى المقاطع المسترجعة فقط. إن لم توجد إجابة صريحة، قل ذلك ووجّه المستخدم للمرشدين.
- اجعل الإجابات مخصصة حسب سؤال المستخدم؛ لا تكرر ردوداً ثابتة.
"""

def _model():
    return genai.GenerativeModel(model_name=_MODEL, system_instruction=_SYSTEM)


def _classify_intent(user_text: str) -> str:
    """LLM تصنيف بسيط: يعيد 'rules' أو 'program'."""
    p = f"""نص المستخدم: \"\"\"{user_text}\"\"\"
أجب بكلمة واحدة فقط (بدون شرح):
- اكتب: مبادرات  → إذا كان يريد ترشيح/برنامج/تمويل/حاضنة تناسب فكرته
- اكتب: لوائح   → إذا كان يسأل عن القواعد/الشروط/التحكيم/المسموح/الممنوع
"""
    out = _model().generate_content(p).text.strip()
    return "rules" if "لوائح" in out else "program"

def _extract_brief_attrs(user_text: str) -> str:
    """اطلب من LLM استخراج سمات الفكرة بصيغة أسطر بسيطة (ليست JSON صارمة)."""
    p = f"""استخرج من وصف المستخدم هذه المفاتيح إن وجدت: sector, stage, need, team_size, city.
أعدها كسطور مثل:
sector: ...
stage: ...
need: ...
(إذا نقصت معلومات، اسأل سؤالاً واحداً واضحاً لجمعها)
نص المستخدم: {user_text}"""
    return _model().generate_content(p).text.strip()


# NEW: نبني استعلام بحث يعتمد على آخر تاريخ للمستخدم
def _build_contextual_query(user_text: str, session: Dict[str, Any]) -> str:
    hist = session.get("history", [])
    last_users = [m["content"] for m in hist[-5:] if m["role"] == "user"]
    ctx = " | ".join(last_users[-2:])  # آخر مدخلين من المستخدم
    return f"{user_text} || context: {ctx}" if ctx else user_text

# NEW: نقرأ سمات بسيطة من النص المستخرج
def _parse_attrs(lines: str) -> Dict[str, Optional[str]]:
    attrs = {"sector": None, "stage": None, "need": None, "team_size": None, "city": None}
    for ln in lines.splitlines():
        ln = ln.strip().lower()
        for k in attrs.keys():
            if ln.startswith(f"{k}:"):
                v = ln.split(":",1)[1].strip()
                attrs[k] = v or None
    return attrs

def smart_answer(user_text: str, session: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if session is None:
        session = {"history": [], "slots": {}, "pending_question": None}

    # خزّني رسالة المستخدم في تاريخ الجلسة
    session["history"].append({"role": "user", "content": user_text})

    # لو فيه سؤال إيضاح معلّق، اعتبر الرد الحالي إجابة عليه
    if session.get("pending_question"):
        slots = session.setdefault("slots", {})
        # تبسيط: نخزن الإجابة الحرة ثم نمسح حالة التعليق
        slots["free_answer"] = user_text
        session["pending_question"] = None

    # تحديد النية
    intent = _classify_intent(user_text)

    # ===== مسار اللوائح =====
    if intent == "rules":
        q = _build_contextual_query(user_text, session)
        hits: List[Dict[str, Any]] = search_rules(q, k=3)
        if not hits:
            reply = "لم أجد نصًا صريحًا يجيب عن سؤالك في اللوائح. اسأل المرشدين المتواجدين."
            session["history"].append({"role": "assistant", "content": reply})
            return {"mode": "rules", "text": reply, "sources": [], "session": session}

        ctx_lines, sources = [], []
        for h in hits:
            rule  = h.get("rule", {})
            title = rule.get("title","")
            content = rule.get("content","")
            ctx_lines.append(f"- {title}: {content}")
            sources.append({"id": rule.get("id",""), "title": title, "score": h.get("score", 0)})

        ctx = "\n".join(ctx_lines)
        p = f"""سؤال المستخدم: {user_text}

مقاطع اللوائح:
{ctx}

أجب بجملة أو جملتين دقيقتين وبالعربية. استخدم المقاطع فقط؛ إن لم تكن الإجابة صريحة، قل ذلك ووجّه السؤال للمرشدين."""
        reply = _model().generate_content(p).text.strip()
        session["history"].append({"role": "assistant", "content": reply})
        return {"mode": "rules", "text": reply, "sources": sources, "session": session}

    # ===== مسار المبادرات =====
    # 1) استخرج السمات
    attrs_text = _extract_brief_attrs(user_text)
    extracted = _parse_attrs(attrs_text)

    # دمج إجابة حرة سابقة إن وُجدت
    if session["slots"].get("free_answer") and not extracted.get("need"):
        extracted["need"] = session["slots"].pop("free_answer")

    # 2) لو ناقص (sector/stage/need) اسأل سؤال إيضاح واحد ثم توقّف
    missing = [k for k in ("sector","stage","need") if not extracted.get(k)]
    if missing and not session.get("pending_question"):
        ask = "عطني سطر واحد يوضح: " + ", ".join(missing) + "؟"
        session["pending_question"] = "attrs"
        session["history"].append({"role": "assistant", "content": ask})
        return {"mode": "program", "text": ask, "sources": [], "session": session}

    # 3) ابحث عن مبادرة عبر RAG بالسياق
    q = _build_contextual_query(user_text, session)
    hits: List[Dict[str, Any]] = search_programs(q, k=3)
    if not hits:
        reply = "أعطني نبذة مختصرة عن فكرتك (القطاع، المرحلة، نوع الدعم المطلوب) لأرشّح لك مبادرة مناسبة."
        session["history"].append({"role": "assistant", "content": reply})
        return {"mode": "program", "text": reply, "sources": [], "session": session}

    top = hits[0]
    prog  = top.get("program", {}) or {}
    title = prog.get("page_title", "مبادرة مناسبة")
    desc  = (prog.get("description","") or "")[:300]

    brief = f"العنوان: {title}\nالوصف: {desc}..."
    p = f"""وصف المستخدم/احتياجه الحالي: {user_text}

سمات مستخرجة (قد تكون ناقصة):
{attrs_text}

أقرب مبادرة (درجة تقريبية {top.get("score", 0)}):
{brief}

اكتب ردًا موجزًا بالعربية:
- رشّح المبادرة بالاسم واذكر سببًا مناسبًا لفكرة المستخدم (سطرين).
- اختم: "للمزيد من التفاصيل زور موقع بوصلة الممكنات."
"""
    reply = _model().generate_content(p).text.strip()
    session["history"].append({"role": "assistant", "content": reply})
    sources = [{"title": title, "url": prog.get("url",""), "score": top.get("score", 0)}]
    return {"mode": "program", "text": reply, "sources": sources, "session": session}
