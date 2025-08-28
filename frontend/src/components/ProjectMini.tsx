export default function ProjectMini({
  name, city, sector, readiness, delta,
}: { name: string; city: string; sector: string; readiness: number; delta?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 backdrop-blur-md p-4 flex items-center justify-between">
      <div>
        <div className="font-semibold">{name}</div>
        <div className="mt-0.5 text-[12px] text-white/60">{city} • {sector}</div>
      </div>
      <div className="text-end">
        <div className="text-lg font-extrabold">{readiness}%</div>
        <div className="text-[11px] text-emerald-300">{delta ?? ""}</div>
      </div>
    </div>
  );
}
