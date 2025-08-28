"use client";

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type StackSerie = { label: string; data: number[]; color: string };
type Props = { labels: string[]; stacks: StackSerie[] };

export default function StackedBar({ labels, stacks }: Props) {
  const data = {
    labels,
    datasets: stacks.map(s => ({
      label: s.label,
      data: s.data,
      backgroundColor: s.color,
      borderRadius: 6,
      barThickness: 20,
    })),
  };

  const options: any = {
    animation: { duration: 900, easing: "easeOutQuart" },
    plugins: {
      legend: { labels: { color: "#C9D3CE" } },
      tooltip: { mode: "index", intersect: false },
    },
    responsive: true,
    scales: {
      x: {
        stacked: true,
        grid: { color: "rgba(255,255,255,.05)" },
        ticks: { color: "#9fb0a9" },
      },
      y: {
        stacked: true,
        grid: { color: "rgba(255,255,255,.05)" },
        ticks: { color: "#9fb0a9" },
      },
    },
    maintainAspectRatio: false,
  };

  return <div className="h-64"><Bar data={data} options={options} /></div>;
}
