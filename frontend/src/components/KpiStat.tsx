type Props = {
  title: string;
  value: string;
  hint?: string;
  trend?: "up" | "flat";
};

export default function KpiStat({ title, value, hint, trend = "flat" }: Props) {
  return (
    <div className="kpi">
      <div className="kpi-title">{title}</div>
      <div className="flex items-baseline gap-3">
        <div className="kpi-value text-[var(--color-text)]">{value}</div>
        {hint && (
          <span className={`badge ${trend === "up" ? "badge--up" : "badge--muted"}`}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
