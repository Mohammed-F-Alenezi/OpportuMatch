"use client";
import "./registry";
import { Doughnut } from "react-chartjs-2";

export default function DonutThin({
  labels, values, colors, height = 200,
}: { labels: string[]; values: number[]; colors: string[]; height?: number }) {
  return (
    <Doughnut height={height}
      data={{
        labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }],
      }}
      options={{ cutout: "70%", plugins: { legend: { display: false } } }}
    />
  );
}
