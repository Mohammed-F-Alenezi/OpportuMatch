"use client";

import { pct } from "lib/format";

type Props = {
  name: string;
  readiness: number;        // 0..100
  peerNote?: string;        // مثال: "في نفس القطاع والمنطقة، بلغت جاهزية المنشآت المشابهة حوالي 65%."
  size?: number;            // قطر الدائرة بالبكسل (اختياري)
  stroke?: number;          // سماكة الدائرة (اختياري)
};

export default function ProjectCard({
  name,
  readiness,
  peerNote,
  size = 96,
  stroke = 10,
}: Props) {
  const clamped = Math.max(0, Math.min(100, readiness));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  // ألوان حسب النسبة
  const trackColor = "var(--card-surface-2)";
  let barColor = "var(--accent)";
  if (clamped < 40) barColor = "#ef4444";      // أحمر
  else if (clamped < 70) barColor = "#f59e0b"; // برتقالي

  return (
    <div className="card p-5 flex items-center gap-4">
      {/* Donut progress */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`جاهزية ${pct(clamped)}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={barColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        {/* الرقم داخل الدائرة */}
        <div
          className="absolute inset-0 grid place-items-center font-bold"
          style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
        >
          <span className="text-lg md:text-xl">{pct(clamped)}</span>
        </div>
      </div>

      {/* النصوص */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg md:text-xl font-extrabold">
          {name}
        </h3>
        {peerNote && (
          <p className="text-sm text-[color:var(--color-subtle)] mt-1 leading-snug">
            {peerNote}
          </p>
        )}
      </div>
    </div>
  );
}
