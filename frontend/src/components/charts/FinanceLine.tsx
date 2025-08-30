"use client";

import "./registry";
import { Line } from "react-chartjs-2";
import { formatNumberArabic, fullEN } from "lib/format";

/** قراءة متغيّر CSS مع قيمة احتياطية */
function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function FinanceLine({
  labels,
  revenue,
  expenses,
  surplus,
  height = 260,
}: {
  labels: string[];
  revenue: number[];
  expenses: number[];
  surplus: number[];
  height?: number;
}) {
  const cRevenue = cssVar("--chart-revenue", "#00C37A");
  const cExpenses = cssVar("--chart-expenses", "#52E29F");
  const cSurplus  = cssVar("--chart-surplus",  "#2FD6C7");
  const cGrid     = cssVar("--grid-line", "rgba(255,255,255,.07)");
  const cAxis     = cssVar("--axis-label", "rgba(255,255,255,.7)");
  const cLegend   = cssVar("--legend-label", "rgba(255,255,255,.85)");

  return (
    <Line
      height={height}
      data={{
        labels,
        datasets: [
          { label: "الإيرادات", data: revenue, tension:.35, borderWidth:2, pointRadius:0, borderColor: cRevenue },
          { label: "النفقات",  data: expenses, tension:.35, borderWidth:2, pointRadius:0, borderColor: cExpenses },
          { label: "الفائض",   data: surplus, tension:.35, borderWidth:2, pointRadius:0, borderColor: cSurplus  },
        ],
      }}
      options={{
        plugins: {
          legend: { labels: { color: cLegend } },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatNumberArabic(ctx.parsed.y)}`,
              footer: (items) => (items?.length ? `المجموع: ${fullEN(items.reduce((s,i)=>s+(i.parsed.y||0),0))}` : ""),
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: cAxis } },
          y: {
            grid: { color: cGrid },
            ticks: {
              color: cAxis,
              callback: (_, i, ticks) => {
                const v = (ticks[i] as any).value ?? 0;
                return formatNumberArabic(Number(v));
              },
            },
          },
        },
        maintainAspectRatio: false,
        responsive: true,
      }}
    />
  );
}
