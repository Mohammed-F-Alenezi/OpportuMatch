"use client";
import { useMemo, useState, useEffect } from "react";
import { LayoutGroup } from "framer-motion";
import InitiativeCard from "@/components/ui/InitiativeCard";
import InitiativeModal from "@/components/ui/InitiativeModal";
import { INITIATIVES } from "@/lib/initiatives";
import HeroOrbCTA from "@/components/HeroOrbCTA";
import BubbleRagOverlay from "@/components/BubbleRagOverlay";

export default function Page() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<any>(null);
  const [projects, setProjects] = useState([]);
  const [ragOpen, setRagOpen] = useState(false);

  const filtered = useMemo(
    () => INITIATIVES.filter((i) => i.title.includes(query)),
    [query]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch("http://127.0.0.1:8000/users/me/projects", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []));
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-8">
      {/* Top bar (under navbar) */}
      <LayoutGroup id="rag-orb-group">
        <div className="sticky top-16 md:top-20 z-30" dir="rtl">
          <div
            className="flex items-center gap-4 border-b py-3"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Search as a simple bar */}
            <label
              className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background:
                  "color-mix(in oklab, var(--surface2) 50%, transparent)",
              }}
            >
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="ابحث باسم المبادرة أو الجهة"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            {/* Bubble beside the search (opens overlay) */}
            <HeroOrbCTA size={72} onOpen={() => setRagOpen(true)} />
          </div>
        </div>

        {/* intro */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div
            className="rounded-3xl border p-6 md:col-span-3"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="mb-1 text-sm" style={{ color: "var(--brand)" }}>
              مرحبًا
            </p>
            <h2 className="mb-3 text-2xl font-semibold">المبادرة الأفضل لمشروعك</h2>
            <p style={{ color: "var(--subtext)" }}>
              اضغط على أي بطاقة للتفاصيل والمقارنة.
            </p>
          </div>
        </div>

        {/* cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((it) => (
            <InitiativeCard
              key={it.id}
              item={it}
              onOpen={setActive}
              score={0.6 + Math.random() * 0.35}
            />
          ))}
        </div>

        <InitiativeModal item={active} onClose={() => setActive(null)} />

        {/* Full-page takeover overlay (morphs from the bubble) */}
        <BubbleRagOverlay open={ragOpen} onClose={() => setRagOpen(false)} />
      </LayoutGroup>
    </main>
  );
}
