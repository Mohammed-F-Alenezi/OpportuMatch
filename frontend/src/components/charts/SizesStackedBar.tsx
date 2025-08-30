"use client";

import "./registry";
import { Bar } from "react-chartjs-2";
import { formatNumberArabic } from "lib/format";

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function SizesStackedBar({
  labels,
  micro,
  small,
  medium,
  height = 260,
}: {
  labels: string[];
  micro: number[];
  small: number[];
  medium: number[];
  height?: number;
}) {
  const cMicro  = cssVar("--series-micro",  "#00E693");
  const cSmall  = cssVar("--series-small",  "#33C9BA");
  const cMedium = cssVar("--series-medium", "#16B394");
  const cGrid   = cssVar("--grid-line", "rgba(255,255,255,.07)");
  const cAxis   = cssVar("--axis-label", "rgba(255,255,255,.7)");
  const cLegend = cssVar("--legend-label", "rgba(255,255,255,.85)");

  return (
    <Bar
      height={height}
      data={{
        labels,
        datasets: [
          { label: "متناهية", data: micro,  backgroundColor: cMicro,  borderRadius: 8 },
          { label: "صغيرة",   data: small,  backgroundColor: cSmall,  borderRadius: 8 },
          { label: "متوسطة",  data: medium, backgroundColor: cMedium, borderRadius: 8 },
        ],
      }}
      options={{
        plugins: {
          legend: { labels: { color: cLegend } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatNumberArabic(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: cAxis } },
          y: {
            stacked: true,
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
