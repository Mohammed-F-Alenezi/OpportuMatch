"use client";

import "./registry";
import { Doughnut } from "react-chartjs-2";
import { formatNumberArabic } from "lib/format";

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function SizeDonut({
  labels,
  values,
  height = 220,
}: {
  labels: string[];
  values: number[];
  height?: number;
}) {
  const cMicro  = cssVar("--series-micro",  "#00E693");
  const cSmall  = cssVar("--series-small",  "#33C9BA");
  const cMedium = cssVar("--series-medium", "#16B394");
  const cLegend = cssVar("--legend-label", "rgba(255,255,255,.85)");

  return (
    <Doughnut
      height={height}
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [cMicro, cSmall, cMedium],
            borderWidth: 0,
            cutout: "68%",
          },
        ],
      }}
      options={{
        plugins: {
          legend: { display: true, labels: { color: cLegend } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatNumberArabic(ctx.parsed)}`,
            },
          },
        },
        maintainAspectRatio: false,
        responsive: true,
      }}
    />
  );
}
