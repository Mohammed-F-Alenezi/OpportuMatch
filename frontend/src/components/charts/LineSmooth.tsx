"use client";
import "./registry";
import { Line } from "react-chartjs-2";

export default function LineSmooth({
  labels, seriesA, seriesB, height = 200,
}: { labels: string[]; seriesA: number[]; seriesB?: number[]; height?: number }) {
  return (
    <Line height={height}
      data={{
        labels,
        datasets: [
          {
            label: "Growth",
            data: seriesA,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 0,
          },
          ...(seriesB ? [{
            label: "Benchmark",
            data: seriesB,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 0,
          }] : []),
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "rgba(255,255,255,.55)" } },
          y: { grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "rgba(255,255,255,.55)" } },
        },
        elements: { line: { borderColor: "#52E29F" }, point: { backgroundColor: "#52E29F" } },
      }}
    />
  );
}
