"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const EASE: number[] = [0.22, 1, 0.36, 1];

type Project = {
  id: string;
  name: string;
  description?: string | null;
  stage?: string | null;
  sectors?: string[] | null;
  funding_need?: number | null;
  updated_at?: string | null;
};

type Match = {
  program_id?: string | null;
  program_name?: string | null;
  source_url?: string | null;
  rank?: number | null;
  run_at?: string | null;

  score_rule?: number | null;
  score_content?: number | null;
  score_goal?: number | null;
  score_final_raw?: number | null;
  score_final_cal?: number | null;
  raw_distance?: number | null;

  subs_sector?: number | null;
  subs_stage?: number | null;
  subs_funding?: number | null;

  reasons?: any;
  improvements?: any;
  evidence_project?: any;
  evidence_program?: any;
};

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!id) return;

    async function load() {
      try {
        setLoading(true);
        setErr(null);
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        const [pRes, mRes] = await Promise.all([
          fetch(`${API}/projects/${id}`, { headers }),
          fetch(`${API}/projects/${id}/matches?limit=10`, { headers }),
        ]);

        if (!pRes.ok) throw new Error(await pRes.text());
        if (!mRes.ok) throw new Error(await mRes.text());

        const pJson = await pRes.json();
        const mJson = await mRes.json();

        setProject(pJson.project);
        setMatches(mJson.matches ?? []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const headerChips = useMemo(() => {
    const c: string[] = [];
    if (project?.stage) c.push(project.stage);
    if (project?.sectors?.length) c.push(...project.sectors);
    if (typeof project?.funding_need === "number")
      c.push(`${project.funding_need.toLocaleString()} ﷼`);
    return c;
  }, [project]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-8" style={{ color: "var(--foreground)" }}>
        جارِ التحميل…
      </main>
    );
  }

  if (err || !project) {
    return (
      <main className="mx-auto max-w-5xl p-8" style={{ color: "var(--foreground)" }}>
        <p className="mb-4">حدث خطأ: {err || "لم يتم العثور على المشروع"}</p>
        <button
          onClick={() => router.push("/projects/select")}
          className="underline"
          style={{ color: "var(--brand)" }}
        >
          الرجوع لقائمة المشاريع
        </button>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto max-w-5xl p-6 md:p-8"
      // ⬇️ Important: do NOT set background here,
      // so the page blends with the site background from layout.tsx
      style={{ color: "var(--foreground)" }}
    >
      {/* Hero / project summary */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "tween", ease: EASE, duration: 0.5 }}
        className="relative rounded-3xl p-6 md:p-8 overflow-hidden border mb-6"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          boxShadow: "0 18px 48px rgba(0,0,0,.12)",
        }}
      >
        {/* toned-down overlay (3%) so it doesn't fight your page bg */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1100px 460px at 85% -10%, color-mix(in oklab, var(--brand) 3%, transparent), transparent 55%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}
        />

        <h1 className="relative z-10 text-2xl md:text-3xl font-bold mb-2">{project.name}</h1>
        <p
          className="relative z-10 text-sm"
          style={{ color: "color-mix(in oklab, var(--foreground) 70%, transparent)" }}
        >
          {project.description || "بدون وصف"}
        </p>

        {headerChips.length > 0 && (
          <div className="relative z-10 mt-3 flex flex-wrap gap-2">
            {headerChips.map((t, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full border"
                style={{
                  borderColor: "color-mix(in oklab, var(--border) 70%, transparent)",
                  background: "color-mix(in oklab, var(--brand) 8%, var(--card))",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Matches */}
      <section className="space-y-4">
        {matches.map((m, i) => (
          <MatchCard key={`${m.program_id ?? i}-${m.rank}-${m.run_at}`} m={m} index={i} />
        ))}
        {matches.length === 0 && (
          <p className="text-sm" style={{ color: "var(--subtext-light)" }}>
            لا توجد نتائج مطابقة بعد.
          </p>
        )}
      </section>
    </main>
  );
}

/* ================== UI bits ================== */

function MatchCard({ m, index }: { m: Match; index: number }) {
  const score = pickScore(m);
  const reasons = toArrayOfStrings(m.reasons);
  const improvements = toArrayOfStrings(m.improvements);
  const evProj = toArrayOfStrings(m.evidence_project);
  const evProg = toArrayOfStrings(m.evidence_program);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "tween", ease: EASE, duration: 0.28, delay: index * 0.03 }}
      className="rounded-2xl border p-4 md:p-5"
      style={{
        background:
          "radial-gradient(140% 120% at 0% 100%, color-mix(in oklab, var(--brand-alt) 8%, transparent) 0%, transparent 46%), var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-4">
        <ScoreRing value={score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold truncate">{m.program_name || "برنامج غير معنون"}</h3>
            <div className="flex items-center gap-2">
              {m.rank != null && (
                <span className="text-xs" style={{ color: "var(--subtext-light)" }}>
                  الترتيب #{m.rank}
                </span>
              )}
              {m.source_url && (
                <a
                  href={m.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline underline-offset-4"
                  style={{ color: "var(--brand)" }}
                >
                  فتح الرابط
                </a>
              )}
            </div>
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--subtext-light)" }}>
            آخر تشغيل: {m.run_at ? new Date(m.run_at).toLocaleString("ar-SA") : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Meter label="قواعد المطابقة" value={toPct(m.score_rule)} />
        <Meter label="تشابه المحتوى" value={toPct(m.score_content)} />
        <Meter label="مواءمة الأهداف" value={toPct(m.score_goal)} />
        <Meter
          label="القرب الدلالي"
          value={m.raw_distance != null ? clamp(100 - Math.round(m.raw_distance * 100)) : null}
          hint="% أعلى يعني أقرب (من 1 - raw_distance)"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <SubChip label="قطاع" value={toPct(m.subs_sector)} />
        <SubChip label="مرحلة" value={toPct(m.subs_stage)} />
        <SubChip label="تمويل" value={toPct(m.subs_funding)} />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Box title="لماذا هذا مناسب؟" items={reasons} />
        <Box title="كيف تتحسن فرصك؟" items={improvements} neutral />
      </div>

      {(evProj.length > 0 || evProg.length > 0) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Box title="شواهد من وصف مشروعك" items={evProj} />
          <Box title="شواهد من وثائق البرنامج" items={evProg} />
        </div>
      )}
    </motion.article>
  );
}

function pickScore(m: Match) {
  if (m.score_final_cal != null) return clamp(Math.round(m.score_final_cal * 100));
  if (m.score_final_raw != null) return clamp(Math.round(m.score_final_raw * 100));
  const parts = [m.score_rule, m.score_content, m.score_goal].filter(
    (x): x is number => x != null
  );
  return parts.length ? clamp(Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)) : 0;
}
function toPct(x?: number | null) {
  return x != null ? clamp(Math.round(x * 100)) : null;
}
function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}
function toArrayOfStrings(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "object") return Object.values(v).map(String).filter(Boolean);
  return [String(v)];
}

function ScoreRing({ value }: { value: number }) {
  const v = clamp(value);
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} stroke="color-mix(in oklab, var(--border) 80%, transparent)" strokeWidth="6" fill="none" />
      <motion.circle
        cx="26" cy="26" r={r} stroke="var(--brand)" strokeWidth="6" fill="none" strokeLinecap="round"
        initial={{ strokeDasharray: c, strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (v / 100) * c }}
        transition={{ type: "tween", ease: EASE, duration: 0.8 }}
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="600" style={{ fill: "var(--foreground)" }}>
        {v}%
      </text>
    </svg>
  );
}

function Meter({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  const pct = value ?? 0;
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="text-xs mb-1" style={{ color: "var(--subtext-light)" }}>
        {label}
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "color-mix(in oklab, var(--foreground) 10%, transparent)" }}>
        <motion.div
          className="h-full"
          style={{ background: "var(--brand)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "tween", ease: EASE, duration: 0.6 }}
        />
      </div>
      <div className="mt-1 text-xs">{value != null ? `${pct}%` : "—"}</div>
      {hint && (
        <div className="mt-0.5 text-[11px]" style={{ color: "var(--subtext-light)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function SubChip({ label, value }: { label: string; value: number | null }) {
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full border"
      style={{
        borderColor: "color-mix(in oklab, var(--border) 70%, transparent)",
        background: "color-mix(in oklab, var(--foreground) 8%, transparent)",
      }}
      title={value != null ? `${value}%` : undefined}
    >
      {label} {value != null ? `· ${value}%` : ""}
    </span>
  );
}

function Box({ title, items, neutral = false }: { title: string; items: string[]; neutral?: boolean }) {
  if (!items.length) return null;
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: "var(--border)",
        background: neutral
          ? "color-mix(in oklab, var(--foreground) 6%, transparent)"
          : "color-mix(in oklab, var(--brand) 8%, var(--card))",
      }}
    >
      <div className="text-xs mb-2" style={{ color: "var(--subtext-light)" }}>
        {title}
      </div>
      <ul className="list-disc text-sm pr-5 space-y-1">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
