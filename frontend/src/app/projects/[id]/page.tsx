"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import HeroOrbCTA from "@/components/HeroOrbCTA";
import BubbleRagOverlay from "@/components/BubbleRagOverlay";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  stage?: string | null;
  sectors?: string[] | null;
  funding_need?: number | null;
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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const EASE: number[] = [0.22, 1, 0.36, 1];

/* ---------- helpers ---------- */
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const pct = (x?: number | null) => (x != null ? clamp(Math.round(x * 100)) : null);
const toLines = (v: any): string[] =>
  !v
    ? []
    : Array.isArray(v)
    ? v.map(String).filter(Boolean)
    : typeof v === "object"
    ? Object.values(v).map(String).filter(Boolean)
    : [String(v)];

function pickScore(m: Match) {
  if (m.score_final_cal != null) return clamp(Math.round(m.score_final_cal * 100));
  if (m.score_final_raw != null) return clamp(Math.round(m.score_final_raw * 100));
  const parts = [m.score_rule, m.score_content, m.score_goal].filter(
    (x): x is number => x != null
  );
  return parts.length
    ? clamp(Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100))
    : 0;
}

function sortMatches(ms: Match[]) {
  const copy = [...ms];
  copy.sort((a, b) => {
    const ra = a.rank ?? Number.POSITIVE_INFINITY;
    const rb = b.rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    const sa = a.score_final_cal ?? a.score_final_raw ?? 0;
    const sb = b.score_final_cal ?? b.score_final_raw ?? 0;
    return sb - sa;
  });
  return copy.slice(0, 5);
}

/* ---------- page ---------- */
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // overlay state for the orb
  const [ragOpen, setRagOpen] = useState(false);

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
          fetch(`${API}/projects/${id}/matches?limit=5`, { headers }),
        ]);
        if (!pRes.ok) throw new Error(await pRes.text());
        if (!mRes.ok) throw new Error(await mRes.text());

        const pJson = await pRes.json();
        const mJson = await mRes.json();
        const sorted = sortMatches(mJson.matches ?? []);

        setProject(pJson.project);
        setMatches(sorted);
        setActiveIdx(0);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const active = matches[activeIdx] || null;
  const others = useMemo(
    () => matches.filter((_, i) => i !== activeIdx).slice(0, 4),
    [matches, activeIdx]
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8" style={{ color: "var(--foreground)" }}>
        جارِ التحميل…
      </main>
    );
  }
  if (err || !project) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8" style={{ color: "var(--foreground)" }}>
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

  if (!matches.length) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center" style={{ color: "var(--foreground)" }}>
        <div className="text-lg font-semibold mb-2">لا توجد توصيات بعد</div>
        <p className="opacity-80 mb-4">أكمل بيانات مشروعك ثم أعد تشغيل المطابقة.</p>
        <button
          onClick={() => router.push("/projects/select")}
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: "var(--brand)", color: "white" }}
        >
          الرجوع لقائمة المشاريع
        </button>
      </main>
    );
  }

  return (
    <LayoutGroup id="rag-orb-group">
      <main
        dir="rtl"
        className="mx-auto max-w-7xl px-4 py-6 md:py-8"
        style={{ color: "var(--foreground)" }}
      >
        <div className="mb-4 pr-2 text-lg md:text-xl font-semibold">{project.name}</div>

        <div dir="ltr" className="grid md:grid-cols-3 gap-6 items-stretch">
          {/* LEFT: 2×2 */}
          <section className="md:col-span-1 self-stretch">
            <div className="h-full grid ">
              <div
                className="grid gap-12 mt-1"
                style={{ gridTemplateColumns: "repeat(2,160px)", gridAutoRows: "160px" }}
              >
                {others.map((m, i) => (
                  <SmallMatchCard
                    key={`${m.program_id ?? "p"}-${m.rank}-${m.run_at}-${i}`}
                    m={m}
                    onSelect={() => setActiveIdx(matches.indexOf(m))}
                  />
                ))}
                {Array.from({ length: Math.max(0, 4 - others.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="rounded-2xl border"
                    style={{
                      width: 160,
                      height: 160,
                      background:
                        "color-mix(in oklab, var(--card) 70%, var(--background))",
                      borderColor:
                        "color-mix(in oklab, var(--border) 70%, transparent)",
                      opacity: 0.35,
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT: big card */}
          <section className="md:col-span-2">
            <AnimatePresence mode="wait">
              {active && (
                <BigMatchCard
                  key={`${active.program_id ?? "p"}-${active.rank}-${active.run_at}`}
                  m={active}
                  project={project}
                  onChat={() => setRagOpen(true)}
                />
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* Full-page takeover overlay controlled here */}
      <BubbleRagOverlay open={ragOpen} onClose={() => setRagOpen(false)} />
    </LayoutGroup>
  );
}

/* ================== UI ================== */

function SmallMatchCard({ m, onSelect }: { m: Match; onSelect: () => void }) {
  const score = pickScore(m);
  return (
    <motion.button
      layout
      onClick={onSelect}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3, scale: 1.02, boxShadow: "0 12px 24px rgba(0,0,0,.18)" }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "tween", ease: EASE, duration: 0.22 }}
      className="rounded-2xl border p-4 text-right overflow-hidden w-[168px] h-[168px]"
      style={{
        background: "color-mix(in oklab, var(--card) 70%, var(--background))",
        borderColor: "color-mix(in oklab, var(--border) 70%, transparent)",
      }}
      title={m.program_name || undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs" style={{ color: "var(--subtext-light)" }}>
          {m.rank != null ? `#${m.rank}` : "—"}
        </div>
        <Ring value={score} size={40} stroke={6} />
      </div>
      <div className="mt-2 text-[13px] font-medium line-clamp-3">
        {m.program_name || "برنامج بدون اسم"}
      </div>
    </motion.button>
  );
}

function BigMatchCard({
  m,
  project,
  onChat,
}: {
  m: Match;
  project: Project;
  onChat: () => void;
}) {
  const score = pickScore(m);
  const reasons = toLines(m.reasons);
  const improvements = toLines(m.improvements);
  const evProj = toLines(m.evidence_project);
  const evProg = toLines(m.evidence_program);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.985 }}
      transition={{ type: "tween", ease: EASE, duration: 0.35 }}
      className="relative rounded-3xl p-6 md:p-8 overflow-hidden border"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "0 18px 48px rgba(0,0,0,.12)",
      }}
      dir="rtl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 520px at 90% -10%, color-mix(in oklab, var(--brand) 10%, transparent), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}
      />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Ring value={score} size={56} />
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h3
                className="text-xl md:text-2xl font-bold line-clamp-1"
                title={m.program_name || "برنامج بدون اسم"}
              >
                {m.program_name || "برنامج بدون اسم"}
              </h3>

              {/* Orb chat trigger */}
              <div className="ml-1">
                <HeroOrbCTA size={68} onOpen={onChat} />
              </div>
            </div>

            <div className="text-xs mt-0.5" style={{ color: "var(--subtext-light)" }}>
              الترتيب {m.rank != null ? `#${m.rank}` : "—"} · آخر تشغيل:{" "}
              {m.run_at ? new Date(m.run_at).toLocaleString("ar-SA") : "—"}

              {m.source_url && (
                <a
                  href={m.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline underline-offset-4 shrink-0 mr-3"
                  style={{ color: "var(--brand)" }}
                  title="فتح رابط البرنامج"
                >
                  فتح رابط البرنامج
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Meter label="قواعد المطابقة" value={pct(m.score_rule)} />
        <Meter label="تشابه المحتوى" value={pct(m.score_content)} />
        <Meter label="مواءمة الأهداف" value={pct(m.score_goal)} />
        <Meter
          label="القرب الدلالي"
          value={
            m.raw_distance != null
              ? clamp(100 - Math.round(m.raw_distance * 100))
              : null
          }
          hint="% أعلى يعني أقرب (1 - raw_distance)"
        />
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap gap-2">
        <Chip label="مرحلة" value={pct(m.subs_stage)} />
        <Chip label="قطاع" value={pct(m.subs_sector)} />
        <Chip label="تمويل" value={pct(m.subs_funding)} />
        {typeof project.funding_need === "number" && (
          <span
            className="text-xs px-2.5 py-1 rounded-full border"
            style={{
              borderColor: "color-mix(in oklab, var(--border) 70%, transparent)",
              background: "color-mix(in oklab, var(--brand) 8%, var(--card))",
            }}
          >
            احتياج المشروع · {project.funding_need.toLocaleString()} ﷼
          </span>
        )}
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Box title="لماذا هذا مناسب؟" items={reasons} />
        <Box title="كيف تتحسن فرصك؟" items={improvements} neutral />
      </div>

      {(evProj.length > 0 || evProg.length > 0) && (
        <div className="relative z-10 mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Box title="شواهد من وصف مشروعك" items={evProj} />
          <Box title="شواهد من وثائق البرنامج" items={evProg} />
        </div>
      )}
    </motion.article>
  );
}

/* ---------- atoms ---------- */

function Ring({
  value,
  size = 52,
  stroke = 6,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp(value);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="color-mix(in oklab, var(--border) 80%, transparent)"
        strokeWidth={stroke}
        fill="none"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--brand)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        initial={{ strokeDasharray: c, strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (v / 100) * c }}
        transition={{ type: "tween", ease: EASE, duration: 0.8 }}
      />
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={Math.max(10, Math.round(size * 0.22))}
        fontWeight={600}
        style={{ fill: "var(--foreground)" }}
      >
        {v}%
      </text>
    </svg>
  );
}

function Meter({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  const pctVal = value ?? 0;
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
          animate={{ width: `${pctVal}%` }}
          transition={{ type: "tween", ease: EASE, duration: 0.6 }}
        />
      </div>
      <div className="mt-1 text-xs">{value != null ? `${pctVal}%` : "—"}</div>
      {hint && <div className="mt-0.5 text-[11px]" style={{ color: "var(--subtext-light)" }}>{hint}</div>}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number | null }) {
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
      <div className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
        {title}
      </div>

      <ul className="list-disc text-sm pr-5 space-y-1" style={{ color: "var(--subtext-light)" }}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
