export default function StatCard({
  title, value, hint,
}: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 backdrop-blur-md px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,.22)]">
      <div className="text-[13px] text-white/70">{title}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-extrabold tracking-tight">{value}</div>
        {hint && (
          <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
