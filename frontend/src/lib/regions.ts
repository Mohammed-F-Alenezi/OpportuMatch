// app/lib/regions.ts
export function normalizeRegionName(raw?: string) {
  if (!raw) return "";
  const s = raw.trim().toLowerCase();

  // كل مفتاح هنا هو "شكل/تهجئة" محتمل للاسم، والقيمة هي الاسم الموحّد (مفتاح الربط)
  const map: Record<string, string> = {
    // Arabic -> Canonical
    "منطقة الرياض": "riyadh",
    "منطقة مكة المكرمة": "makkah",
    "منطقة مكة": "makkah",
    "منطقة المدينة المنورة": "madinah",
    "منطقة المدينة": "madinah",
    "منطقة القصيم": "qassim",
    "منطقة الشرقية": "eastern",
    "المنطقة الشرقية": "eastern",
    "منطقة عسير": "asir",
    "منطقة تبوك": "tabuk",
    "منطقة حائل": "hail",
    "منطقة الحدود الشمالية": "northern-borders",
    "منطقة جازان": "jizan",
    "منطقة جيزان": "jizan",
    "منطقة نجران": "najran",
    "منطقة الباحة": "al-bahah",
    "منطقة الجوف": "al-jawf",

    // English -> Canonical
    "riyadh": "riyadh",
    "makkah": "makkah",
    "mecca": "makkah",
    "madinah": "madinah",
    "medina": "madinah",
    "qassim": "qassim",
    "al qassim": "qassim",
    "eastern province": "eastern",
    "ash sharqiyah": "eastern",
    "asir": "asir",
    "tabuk": "tabuk",
    "hail": "hail",
    "northern borders": "northern-borders",
    "jizan": "jizan",
    "najran": "najran",
    "al bahah": "al-bahah",
    "al-bahah": "al-bahah",
    "al jawf": "al-jawf",
    "al-jawf": "al-jawf",
  };

  // لو كان الاسم فيه تشكيل/زيادات، جرّب ننظّفه بسيطًا
  const simple = s.replace(/\s+/g, " ").replace(/[^\u0600-\u06FF a-z-]/g, "");

  return map[s] || map[simple] || s; // إن ما لقينا، نرجّع الاسم بعد التبسيط
}
