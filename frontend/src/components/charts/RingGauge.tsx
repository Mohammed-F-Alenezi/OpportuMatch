"use client";
import "./registry";
import { Doughnut } from "react-chartjs-2";

export default function RingGauge({ percent }: { percent: number }) {
  const v = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-[180px]">
      <Doughnut
        data={{
          labels: ["Ready", "Left"],
          datasets: [{
            data: [v, 100 - v],
            backgroundColor: ["#00C37A", "rgba(255,255,255,.08)"],
            borderWidth: 0,
          }],
        }}
        options={{
          cutout: "75%",
          plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }}
      />
        <div className="text-center">
          <div className="text-3xl font-extrabold">{v}%</div>
          <div className="text-xs text-white/60">جاهزية</div>
        </div>
      </div>
  );
}