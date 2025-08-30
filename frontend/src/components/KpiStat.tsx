"use client";

import { ReactNode } from "react";
import { cn } from "lib/utils"; // اختياري؛ لو ما عندك util للـcn احذف استخدامه واستعمل className عادي

type Delta =
  | { kind: "up"; value: string; label?: string }
  | { kind: "down"; value: string; label?: string }
  | { kind: "flat"; value: string; label?: string };

type Props = {
  title: string;                 // عنوان صغير (مثلاً: "إجمالي المنشآت")
  value: string;                 // القيمة بصيغة نص (مثل 1.6 مليون)
  subtitle?: string;             // سطر مساعد أسفل القيمة (مثل "Q2 2025")
  icon: ReactNode;               // أيقونة lucide-react أو SVG
  tone?: "teal" | "blue" | "violet" | "amber"; // لون الحبة
  delta?: Delta;                 // شارة التغير
  className?: string;
};

const toneMap: Record<NonNullable<Props["tone"]>, { bg: string; fg: string; chip: string }> = {
  teal:   { bg: "bg-emerald-500/14", fg: "text-emerald-300", chip: "text-emerald-400 bg-emerald-500/10" },
  blue:   { bg: "bg-sky-500/14",     fg: "text-sky-300",     chip: "text-sky-400 bg-sky-500/10" },
  violet: { bg: "bg-violet-500/14",  fg: "text-violet-300",  chip: "text-violet-400 bg-violet-500/10" },
  amber:  { bg: "bg-amber-500/20",   fg: "text-amber-300",   chip: "text-amber-400 bg-amber-500/10" },
};

export default function KpiStat({
  title,
  value,
  subtitle,
  icon,
  tone = "teal",
  delta,
  className,
}: Props) {
  const t = toneMap[tone];

  return (
  <div
    className={cn(
      "card p-4 md:p-5 flex items-center gap-4 justify-between",
      "border border-[color:var(--color-border-soft)] hover:border-[color:var(--color-border)] transition-colors",
      className
    )}
  >
    {/* أيقونة + تاق (يسار الكارد) */}
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${t.bg} ${t.fg}`}>
        {icon}
      </div>
      {delta && (
        <span
          className={cn(
            "text-xs font-medium rounded-full px-2 py-0.5",
            "border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface-2)]",
            delta.kind === "up"   && "text-emerald-400",
            delta.kind === "down" && "text-rose-400",
            delta.kind === "flat" && "text-[color:var(--color-subtle)]"
          )}
        >
          {delta.value}
        </span>
      )}
    </div>

    {/* النصوص (يمين) */}
    <div className="flex-1 min-w-0 text-right">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value mt-1 leading-none truncate">{value}</div>
      {subtitle && <div className="kpi-hint mt-1">{subtitle}</div>}
    </div>
  </div>
);

}
