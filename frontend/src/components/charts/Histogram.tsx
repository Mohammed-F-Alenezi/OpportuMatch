"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function toBins(values: number[], bins = 24) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / bins || 1;
  const arr = Array.from({ length: bins }, (_, i) => ({
    x0: min + i * step,
    x1: min + (i + 1) * step,
    mid: min + (i + 0.5) * step,
    count: 0,
  }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / step);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    arr[idx].count += 1;
  });
  return arr;
}

export default function Histogram({
  values,
  bins = 24,
  marker,
  threshold,
}: {
  values: number[];
  bins?: number;
  marker?: number;
  threshold?: number;
}) {
  const data = toBins(values, bins);
  const hasMarker = typeof marker === "number" && !Number.isNaN(marker);
  const hasThresh = typeof threshold === "number" && !Number.isNaN(threshold);

  const axisColor = "var(--subtext-light)";
  const gridColor = "var(--border)";
  const barColor = "var(--brand)";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 12, bottom: 8, left: 8 }}>
        <CartesianGrid vertical={false} stroke={gridColor} strokeOpacity={0.5} />
        <XAxis
          dataKey="mid"
          tickFormatter={(v) => Number(v).toFixed(2)}
          stroke={axisColor}
          tickLine={false}
          axisLine={{ stroke: gridColor }}
          fontSize={12}
        />
        <YAxis
          stroke={axisColor}
          tickLine={false}
          axisLine={{ stroke: gridColor }}
          fontSize={12}
          allowDecimals={false}
        />
        <Tooltip
          wrapperStyle={{ outline: "none" }}
          contentStyle={{
            background: "var(--card)",
            border: `1px solid var(--border)`,
            borderRadius: 12,
          }}
          formatter={(v: any) => [v, "العدد"]}
          labelFormatter={(l: any) => `القيمة ~ ${Number(l).toFixed(3)}`}
        />
        <Bar dataKey="count" fill={barColor} fillOpacity={0.7} radius={[6, 6, 0, 0]} />
        {hasMarker && (
          <ReferenceLine
            x={marker}
            stroke="var(--foreground)"
            strokeDasharray="4 4"
            isFront
            label={{
              position: "top",
              value: "نتيجتك",
              fill: "var(--foreground)",
              fontSize: 12,
            }}
          />
        )}
        {hasThresh && (
          <ReferenceLine
            x={threshold}
            stroke="var(--brand)"
            isFront
            strokeDasharray="2 2"
            label={{
              position: "top",
              value: "الحد الأدنى",
              fill: "var(--brand)",
              fontSize: 12,
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
