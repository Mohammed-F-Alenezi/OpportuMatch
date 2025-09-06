// components/KpiStat.tsx
"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Delta =
  | { kind: "up"; value: string; label?: string }
  | { kind: "down"; value: string; label?: string }
  | { kind: "flat"; value: string; label?: string };

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone?: "teal" | "blue" | "violet" | "amber";
  delta?: Delta;
  className?: string;
};

const toneMap: Record<
  NonNullable<Props["tone"]>,
  { bg: string; fg: string; chip: string }
> = {
  teal:   { bg: "bg-emerald-500/14", fg: "text-emerald-300", chip: "text-emerald-400 bg-emerald-500/10" },
  blue:   { bg: "bg-sky-500/14",     fg: "text-sky-300",     chip: "text-sky-400 bg-sky-500/10" },
  violet: { bg: "bg-violet-500/14",  fg: "text-violet-300",  chip: "text-violet-400 bg-violet-500/10" },
  amber:  { bg: "bg-amber-500/20",   fg: "text-amber-300",   chip: "text-amber-400 bg-amber-500/10" },
};

/**
 * Polished KPI pill card. Add wrapper grid:
 *  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch auto-rows-fr
 */
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
      dir="rtl"
      className={cn(
        "h-full rounded-2xl border bg-[--surface] p-4 md:p-5 shadow-sm",
        "flex items-center justify-between gap-4",
        className
      )}
      style={{ borderColor: "var(--border)" }}
    >
      {/* Left: Icon + delta chip */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", t.bg, t.fg)}>{icon}</div>
        {delta ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium border",
              "border-[--border] bg-[--light-alt]",
              delta.kind === "up" && "text-emerald-400",
              delta.kind === "down" && "text-rose-400",
              delta.kind === "flat" && "text-muted-foreground"
            )}
            aria-label={delta.label}
          >
            {delta.value}
          </span>
        ) : null}
      </div>

      {/* Right: Texts */}
      <div className="min-w-0 flex-1 text-right">
        <div className="kpi-title text-[13px] text-muted-foreground">{title}</div>
        <div className="kpi-value mt-1 truncate text-3xl font-semibold leading-none">{value}</div>
        {subtitle ? <div className="kpi-hint mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
    </div>
  );
}
