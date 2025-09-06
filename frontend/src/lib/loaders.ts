// app/lib/loaders.ts
"use client";
import Papa from "papaparse";
import readXlsx from "read-excel-file";
import type { CsvRow, ExcelRow } from "./types";

/** يقرأ CSV كنص ثم يحلّله */
export async function loadCsvFinance(url = "/data/SMEs.csv"): Promise<CsvRow[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CSV not found at ${url} (status ${res.status})`);
  }
  const text = await res.text();

  return new Promise<CsvRow[]>((resolve, reject) => {
    Papa.parse<CsvRow>(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (r) => resolve((r.data as CsvRow[]).filter(Boolean)),
      error: reject,
    });
  });
}

/** يقرأ إكسل من public/ ثم يحوّله لمصفوفة كائنات */
export async function loadExcelCounts(url = "/data/NumberOfSMEs.xlsx"): Promise<ExcelRow[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`XLSX not found at ${url} (status ${res.status})`);
  }
  const blob = await res.blob();
  const rows = await readXlsx(blob);

  const header = rows[0] as string[];
  const out: ExcelRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: any = {};
    header.forEach((h, idx) => (obj[h] = row[idx]));
    // تطبيع
    if (obj["السنة"] != null) obj["السنة"] = Number(obj["السنة"]);
    if ("عدد المنشآت" in obj && obj["عدد المنشآت"] != null) {
      obj["عدد المنشآت"] = Number(String(obj["عدد المنشآت"]).replace(/[^\d.-]/g, ""));
    }
    out.push(obj as ExcelRow);
  }
  return out;
}
