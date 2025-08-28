"use client";
import "./registry";
import { Bar } from "react-chartjs-2";

export default function BarMini({
  labels, values, height = 220,
}: { labels: string[]; values: number[]; height?: number }) {
  return (
    <Bar height={height}
      data={{
        labels,
        datasets: [{ data: values, borderRadius: 8, backgroundColor: "rgba(82,226,159,.8)" }],
      }}
      options={{
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "rgba(255,255,255,.55)" } },
          y: { grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "rgba(255,255,255,.55)" } },
        },
      }}
    />
  );
}
