// components/KpiCard.tsx
type Props = {
  title: string;
  value: string;
  hint?: string;
  chip?: string;
};

export default function KpiCard({ title, value, hint, chip }: Props) {
  return (
    <div className="kpi">
      <div>
        <div className="kpi-title">{title}</div>
        <div className="kpi-value mt-1">{value}</div>
        {hint && <div className="kpi-hint">{hint}</div>}
      </div>
      {chip && <span className="badge">{chip}</span>}
    </div>
  );
}
