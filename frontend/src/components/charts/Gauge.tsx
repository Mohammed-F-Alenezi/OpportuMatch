"use client";

export default function Gauge({
  value,   // 0..1
  size = 140,
  stroke = 12,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(1, Number(value || 0)));
  const r = (size - stroke) / 2;
  const c = Math.PI * 2 * r;
  const offset = c * (1 - clamped);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          strokeLinecap="round"
          opacity={0.6}
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </g>
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.2}
        fontWeight={600}
        fill="var(--foreground)"
      >
        {(clamped * 100).toFixed(0)}%
      </text>
    </svg>
  );
}
