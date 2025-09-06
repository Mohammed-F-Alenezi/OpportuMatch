// components/KpiCard.tsx
"use client";

type Props = {
  title: string;
  value: string;
  hint?: string;
  chip?: string;
  className?: string;
};

/**
 * Simple KPI card that stretches to fill its grid row.
 * Put the grid wrapper on the parent:
 *  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch auto-rows-fr
 */
export default function KpiCard({ title, value, hint, chip, className }: Props) {
  return (
    <div
      className={[
        "h-full rounded-2xl border p-4 md:p-5",
        "bg-[--surface] border-[--border] shadow-sm",
        "flex items-center justify-between gap-3",
        className || "",
      ].join(" ")}
      dir="rtl"
    >
      <div className="min-w-0">
        <div className="kpi-title text-[13px] text-muted-foreground">{title}</div>
        <div className="kpi-value mt-1 text-3xl font-semibold leading-none truncate">{value}</div>
        {hint ? <div className="kpi-hint mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </div>

      {chip ? (
        <span className="badge shrink-0 rounded-full border border-[--border] bg-[--light-alt] px-2 py-1 text-[11px]">
          {chip}
        </span>
      ) : null}
    </div>
  );
}
