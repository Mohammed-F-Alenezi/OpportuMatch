"use client";
import { useMemo, useState } from "react";
import InitiativeCard from "@/components/ui/InitiativeCard";
import InitiativeModal from "@/components/ui/InitiativeModal";
import { INITIATIVES } from "@/lib/initiatives";

export default function Page() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<any>(null);
  const filtered = useMemo(()=>INITIATIVES.filter(i=>i.title.includes(query)), [query]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-3xl border p-6 md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <p className="mb-1 text-sm" style={{ color: "var(--brand)" }}>مرحبًا</p>
          <h2 className="mb-3 text-2xl font-semibold">المبادرة الأفضل لمشروعك</h2>
          <p style={{ color: "var(--subtext)" }}>اضغط على أي بطاقة للتفاصيل والمقارنة.</p>
        </div>
        <div className="rounded-3xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <label className="flex items-center gap-2 rounded-2xl border px-4 py-2"
                 style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--surface2) 60%, transparent)" }}>
            <input className="w-full bg-transparent text-sm outline-none" placeholder="ابحث باسم المبادرة أو الجهة"
                   value={query} onChange={e=>setQuery(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((it) => (
          <InitiativeCard key={it.id} item={it} onOpen={setActive} score={0.6 + Math.random()*0.35}/>
        ))}
      </div>

      <InitiativeModal item={active} onClose={()=>setActive(null)} />
    </main>
  );
}
