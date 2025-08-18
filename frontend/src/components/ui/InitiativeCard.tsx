"use client";
import { Initiative } from "@/lib/initiatives";

export default function InitiativeCard({ item, onOpen, score = 0.8 }:{
  item: Initiative; onOpen: (i: Initiative)=>void; score?: number;
}) {
  return (
    <button
      onClick={()=>onOpen(item)}
      className="group flex flex-col justify-between rounded-2xl border p-4 text-start transition hover:-translate-y-0.5 hover:shadow"
      style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--surface2) 50%, transparent)" }}
    >
      <div className="mb-3 text-xs" style={{ color: "var(--subtext)" }}>{item.agency} • {item.type}</div>
      <div className="line-clamp-2" style={{ color: "var(--text)" }}>{item.title}</div>
      <div className="mt-4 flex items-center justify-between">
        <span
          className="rounded-full px-2 py-1 text-xs"
          style={{
            background: `color-mix(in oklab, ${item.open ? "var(--success)" : "#f59e0b"} 20%, transparent)`,
            color: item.open ? "var(--brand)" : "#f59e0b",
          }}
        >
          {item.open ? "متاح" : "مغلق مؤقتًا"}
        </span>
        <span className="text-xs" style={{ color: "var(--subtext)" }}>توافق: {Math.round(score*100)}%</span>
      </div>
    </button>
  );
}
