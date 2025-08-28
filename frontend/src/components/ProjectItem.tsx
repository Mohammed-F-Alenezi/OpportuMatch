export default function ProjectItem({
  name, city, sector, readinessPct, tag, summary,
}: {
  name: string; city: string; sector: string; readinessPct: number; tag: string; summary?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 backdrop-blur-md p-4 shadow-[0_8px_24px_rgba(0,0,0,.22)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{name}</div>
          <div className="mt-0.5 text-[12px] text-white/70">{city} • {sector}</div>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
          {tag}
        </span>
      </div>

      {summary && <p className="mt-2 text-sm text-white/80">{summary}</p>}

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-white/70 mb-1">
          <span>الجاهزية</span><span>{readinessPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-[#00C37A]" style={{ width: `${readinessPct}%` }} />
        </div>
      </div>
    </div>
  );
}
