import type { CsvRow, ExcelRow } from "./types";

type KPIs = {
  totalSMEs: number | null;
  yoy: number | null;
  qoq: number | null;
  fastestSector: { name: string; yoy: number } | null;
  topRegion: { name: string; sharePct: number; count?: number } | null;
  latestYear?: number;
  latestQuarterLabel?: string;
};

export function computeKPIs(csv: CsvRow[], xls: ExcelRow[]): KPIs & { yoyLabel?: string } {
  const toNum = (v: unknown) =>
    typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) || 0 : 0;

  const toQ = (q: any) =>
    typeof q === "string" && /^q\d+/i.test(q) ? Number(q.replace(/q/i, "")) : Number(q || 0);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

  // --- تجهيز بيانات الإكسل ---
  const rows = xls.filter((r) => Number(r["السنة"]));
  const years = [...new Set(rows.map((r) => Number(r["السنة"])))].sort((a, b) => a - b);
  const latestYearExcel = years.at(-1)!;
  const hasQuarter = rows.some((r) => r["الربع"] != null && r["الربع"] !== "");
  const rowsYear = (y: number) => rows.filter((r) => Number(r["السنة"]) === y);
  const sumYear = (y: number) => sum(rowsYear(y).map((r) => toNum(r["عدد المنشآت"])));

  // أحدث فترة للبطاقات (totalSMEs + label)
  let latestQuarterLabel: string | undefined;
  let totalSMEs = 0;

  if (hasQuarter) {
    const ry = rowsYear(latestYearExcel);
    const latestQ = Math.max(...ry.map((r) => toQ(r["الربع"])).filter(Boolean));
    const latestRows = ry.filter((r) => toQ(r["الربع"]) === latestQ);
    totalSMEs = sum(latestRows.map((r) => toNum(r["عدد المنشآت"])));
    latestQuarterLabel = `Q${latestQ} ${latestYearExcel}`;
  } else {
    totalSMEs = sumYear(latestYearExcel);
  }

  // === YoY الذكي ===
  let yoy: number | null = null;
  let yoyLabel: string | undefined;

  if (hasQuarter) {
    const ry = rowsYear(latestYearExcel);
    const latestQ = Math.max(...ry.map((r) => toQ(r["الربع"])).filter(Boolean));

    const sumYearUpToQ = (y: number, q: number) =>
      sum(rows.filter((r) => Number(r["السنة"]) === y && toQ(r["الربع"]) >= 1 && toQ(r["الربع"]) <= q)
               .map((r) => toNum(r["عدد المنشآت"])));

    const sumTTM = (y: number, q: number) => {
      // آخر 4 أرباع تنتهي عند (y,q)
      const vals: number[] = [];
      let cy = y, cq = q;
      for (let i = 0; i < 4; i++) {
        const v = sum(rows.filter((r) => Number(r["السنة"]) === cy && toQ(r["الربع"]) === cq)
                          .map((r) => toNum(r["عدد المنشآت"])));
        vals.push(v);
        cq -= 1;
        if (cq < 1) { cq = 4; cy -= 1; }
      }
      return sum(vals);
    };

    if (latestQ < 4) {
      // نفس الفترة (مثال: H1 2025 vs H1 2024)
      const cur = sumYearUpToQ(latestYearExcel, latestQ);
      const prev = sumYearUpToQ(latestYearExcel - 1, latestQ);
      yoy = prev > 0 ? ((cur - prev) / prev) * 100 : null;
      yoyLabel = "YoY (نفس الفترة)";
    } else {
      // TTM
      const curTTM = sumTTM(latestYearExcel, latestQ);
      // الأرباع الأربعة السابقة مباشرة
      let py = latestYearExcel, pq = latestQ - 4;
      while (pq <= 0) { pq += 4; py -= 1; } // نهاية نافذة TTM السابقة
      const prevTTM = sumTTM(py, pq);
      yoy = prevTTM > 0 ? ((curTTM - prevTTM) / prevTTM) * 100 : null;
      yoyLabel = "YoY (TTM)";
    }
  } else {
    // سنوي كامل
    const cur = sumYear(latestYearExcel);
    const prev = sumYear(latestYearExcel - 1);
    yoy = prev > 0 ? ((cur - prev) / prev) * 100 : null;
    yoyLabel = "YoY (سنوي)";
  }

  // === QoQ ===
  let qoq: number | null = null;
  if (hasQuarter) {
    const ry = rowsYear(latestYearExcel);
    const latestQ = Math.max(...ry.map((r) => toQ(r["الربع"])).filter(Boolean));

    const sumQuarter = (y: number, q: number) =>
      sum(rows.filter((r) => Number(r["السنة"]) === y && toQ(r["الربع"]) === q)
              .map((r) => toNum(r["عدد المنشآت"])));

    let prevQ = latestQ - 1;
    let prevY = latestYearExcel;
    if (prevQ < 1) { prevQ = 4; prevY -= 1; }

    const curQ = sumQuarter(latestYearExcel, latestQ);
    const lastQ = sumQuarter(prevY, prevQ);
    qoq = lastQ > 0 ? ((curQ - lastQ) / lastQ) * 100 : null;
  }

  // === القطاع الأسرع نموًا (CSV) — كما عندك ===
  let fastestSector: KPIs["fastestSector"] = null;
  {
    const yearsCsv = [...new Set(csv.map((r) => Number(r["السنة"])))].filter(Boolean).sort((a, b) => a - b);
    const latestYearCsv = yearsCsv.at(-1);
    const prevYearCsv = yearsCsv.at(-2);
    if (latestYearCsv && prevYearCsv) {
      const bySector = (y: number) => {
        const m = new Map<string, number>();
        for (const r of csv.filter((x) => Number(x["السنة"]) === y)) {
          const v =
            toNum(r["الفائض_موزع"]) || toNum(r["الإيرادات_موزع"]) || toNum(r["إجمالي_عدد_المنشآت"]) || 0;
          const key = String(r["القطاع_العام"] || "غير معروف");
          m.set(key, (m.get(key) || 0) + v);
        }
        return m;
      };
      const curS = bySector(latestYearCsv);
      const prevS = bySector(prevYearCsv);
      let best = { name: "", yoy: -Infinity };
      for (const [sec, curVal] of curS.entries()) {
        const pv = prevS.get(sec) || 0;
        if (pv > 0) {
          const y = ((curVal - pv) / pv) * 100;
          if (y > best.yoy) best = { name: sec, yoy: y };
        }
      }
      if (best.name) fastestSector = best;
    }
  }

  // === المنطقة الأعلى تركّزًا (أحدث فترة) — كما عندك ===
  let topRegion: KPIs["topRegion"] = null;
  {
    const ry = rowsYear(latestYearExcel);
    const latestQ = hasQuarter ? Math.max(...ry.map((r) => toQ(r["الربع"])).filter(Boolean)) : null;
    const latestRowsForCard = hasQuarter
      ? ry.filter((r) => toQ(r["الربع"]) === latestQ)
      : rowsYear(latestYearExcel);

    const byRegion = new Map<string, number>();
    for (const r of latestRowsForCard) {
      const key = String(r["المنطقة"] || "غير معروف");
      byRegion.set(key, (byRegion.get(key) || 0) + toNum(r["عدد المنشآت"]));
    }
    let best = { name: "", val: 0 };
    for (const [k, v] of byRegion.entries()) if (v > best.val) best = { name: k, val: v };
    if (best.val > 0) topRegion = { name: best.name, sharePct: (best.val / totalSMEs) * 100, count: best.val };
  }

  return {
    totalSMEs,
    yoy,
    qoq,
    fastestSector,
    topRegion,
    latestYear: latestYearExcel,
    latestQuarterLabel,
    yoyLabel,
  };
}


// ===== Data for charts =====

// Line (الإيرادات/النفقات/الفائض) عبر السنوات
export function seriesFinance(csv: CsvRow[]) {
  const agg = new Map<number, { rev: number; exp: number; sur: number }>();
  for (const r of csv) {
    const y = Number(r["السنة"]); if (!y) continue;
    const cur = agg.get(y) || { rev:0, exp:0, sur:0 };
    cur.rev += Number(r["الإيرادات_موزع"])||0;
    cur.exp += Number(r["النفقات_موزع"])||0;
    cur.sur += Number(r["الفائض_موزع"])||0;
    agg.set(y, cur);
  }
  const years = [...agg.keys()].sort((a,b)=>a-b);
  return {
    labels: years.map(String),
    revenue: years.map(y => agg.get(y)!.rev),
    expenses: years.map(y => agg.get(y)!.exp),
    surplus: years.map(y => agg.get(y)!.sur),
  };
}

// Stacked Bar (عدد المنشآت حسب الحجم) عبر السنوات
export function seriesSizesByYear(xls: ExcelRow[]) {
  const agg = new Map<number, { micro:number; small:number; medium:number }>();
  for (const r of xls) {
    const y = Number(r["السنة"]); if (!y) continue;
    const cur = agg.get(y) || { micro:0, small:0, medium:0 };
    cur.micro += Number(r["عدد المنشآت متناهية الصغر"])||0;
    cur.small += Number(r["عدد المنشآت الصغيرة"])||0;
    cur.medium += Number(r["عدد المنشآت المتوسطة"])||0;
    agg.set(y, cur);
  }
  const years = [...agg.keys()].sort((a,b)=>a-b);
  return {
    labels: years.map(String),
    micro: years.map(y=>agg.get(y)!.micro),
    small: years.map(y=>agg.get(y)!.small),
    medium: years.map(y=>agg.get(y)!.medium),
  };
}

// Donut لأحدث فترة (توزيع الأحجام)
export function donutLatestSize(xls: ExcelRow[]) {
  const latest = Math.max(...xls.map(r=>Number(r["السنة"])).filter(Boolean));
  const rows = xls.filter(r=>r["السنة"]===latest);
  const sum = (k:string)=> rows.reduce((a,r)=>a+(Number((r as any)[k])||0),0);
  const micro = sum("عدد المنشآت متناهية الصغر");
  const small = sum("عدد المنشآت الصغيرة");
  const medium = sum("عدد المنشآت المتوسطة");
  return {
    labels: ["متناهية", "صغيرة", "متوسطة"],
    values: [micro, small, medium],
  };
}

// Choropleth: عدد المنشآت حسب المنطقة (أحدث فترة)
import { normalizeRegionName } from "./regions";

export function regionCountsLatest(xls: any[]) {
  // اختَر أحدث فترة: إن كان عندك أرباع خذ آخر سنة/ربع، وإلا آخر سنة
  const years = xls.map(r => Number(r["السنة"])).filter(Boolean);
  const latestYear = Math.max(...years);
  const hasQuarter = xls.some(r => r["الربع"]);
  const toQ = (q:any) => typeof q === "string" && q.toUpperCase().startsWith("Q")
    ? Number(q.replace(/q/i,""))
    : Number(q);

  let rows = xls.filter(r => Number(r["السنة"]) === latestYear);
  if (hasQuarter) {
    const latestQ = Math.max(...rows.map(r => toQ(r["الربع"])).filter(Boolean));
    rows = rows.filter(r => toQ(r["الربع"]) === latestQ);
  }

  const byRegion = new Map<string, number>();
  for (const r of rows) {
    const key = normalizeRegionName(String(r["المنطقة"] || r["Region"] || ""));
    const v = Number(String(r["عدد المنشآت"] ?? "0").replace(/[^\d.-]/g, "")) || 0;
    byRegion.set(key, (byRegion.get(key) || 0) + v);
  }
  return byRegion; // مفاتيحه أسماء موحّدة
}

