// src/components/projects/ProjectPicker.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import BizInfo from "@/components/biz-info";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type ProjectRow = {
  id: string;
  name: string;
  updated_at?: string | null;
  last_message?: string | null;
  score?: number | null;
};

type Project = {
  id: string;
  name: string;
  lastMessage?: string | null;
  updatedAt?: string | null; // ISO
  score?: number | null;     // 0..100
};

export default function ProjectPicker({
  title = "اختر محادثتك",
}: {
  title?: string;
}) {
  const router = useRouter();

  const [items, setItems] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(false);

  // === جلب المشاريع من الـAPI ===
  async function loadProjects() {
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${API}/projects/summary`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        // fallback لو ما عندك summary endpoint بعد
        const fallback = await fetch(`${API}/users/me/projects`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const fbJson = await fallback.json();
        const mapped: Project[] = (fbJson.projects ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          updatedAt: p.updated_at,
          lastMessage: null,
          score: null,
        }));
        setItems(mapped);
        return;
      }
      const data = await res.json();
      const mapped: Project[] = (data.projects as ProjectRow[]).map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updated_at ?? null,
        lastMessage: p.last_message ?? null,
        score: p.score ?? null,
      }));
      setItems(mapped);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  // === إعادة التسمية عبر الـAPI ===
  async function apiRename(id: string, name: string) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${API}/projects/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(await res.text());
    // حدّث الحالة محليًا
    setItems((prev) =>
      prev?.map((p) => (p.id === id ? { ...p, name } : p)) ?? prev
    );
  }

  // === حالات واجهة موجودة أصلًا ===
  const [addOpen, setAddOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function startRename(p: Project) {
    setRenamingId(p.id);
    setRenameValue(p.name);
  }
  async function commitRename() {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (!name) return setRenamingId(null);
    await apiRename(renamingId, name);
    setRenamingId(null);
  }

  // قفل سكرول عند فتح اللوحة
  useEffect(() => {
    if (!addOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = (document.body.style as any).paddingInlineEnd;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) (document.body.style as any).paddingInlineEnd = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as any).paddingInlineEnd = prevPadding;
    };
  }, [addOpen]);

  const EASE: number[] = [0.22, 1, 0.36, 1];

  const rowBase: React.CSSProperties = {
    background: `
      radial-gradient(140% 120% at 0% 100%,
        color-mix(in oklab, var(--brand-alt) 12%, transparent) 0%,
        transparent 46%),
      var(--card)
    `,
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.02)",
  };

  return (
    <div
      dir="rtl"
      className="min-h-[100svh]"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="mx-auto w-full max-w-5xl py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--subtext-light)" }}>
            كل عنصر يمثل محادثة RAG — اختر واحدة أو ابدأ محادثة جديدة
          </p>
        </header>

        <div className="flex items-start gap-6" dir="ltr">
          {/* اللوحة الجانبية (إضافة) */}
          <AnimatePresence>
            {addOpen && (
              <motion.aside
                key="add-panel"
                initial={{ width: 0, opacity: 0, x: -24 }}
                animate={{ width: "56%", opacity: 1, x: 0 }}
                exit={{
                  width: 0,
                  opacity: 0,
                  x: -16,
                  transition: {
                    type: "tween",
                    ease: EASE,
                    duration: 0.22,
                    width: { duration: 0.24 },
                    x: { duration: 0.20 },
                    opacity: { duration: 0.16 },
                  },
                  transitionEnd: { display: "none" },
                }}
                transition={{ type: "tween", ease: EASE, duration: 0.55 }}
                className="overflow-hidden rounded-3xl border"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="flex items-center justify-between mb-3" dir="rtl">
                    <h2 className="text-lg sm:text-xl font-semibold">إضافة محادثة جديدة</h2>
                    <button
                      onClick={() => {
                        setAddOpen(false);
                        // حمّل القائمة بعد الإضافة (لو عدّلت BizInfo لعمل redirect، ارجع يدويًا)
                        setTimeout(loadProjects, 350);
                      }}
                      className="rounded-md p-2 hover:opacity-80"
                      aria-label="إغلاق"
                      title="إغلاق"
                      style={{ color: "var(--subtext-light)" }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div dir="rtl" className="max-h-[70vh] overflow-auto pr-1">
                    {/* يفضّل تمرير onSuccess داخل BizInfo لتستدعي loadProjects() */}
                    <BizInfo className="py-0" />
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* القائمة اليمنى */}
          <motion.div
            initial={false}
            animate={{ width: addOpen ? "44%" : "100%" }}
            transition={{ type: "tween", ease: EASE, duration: 0.55 }}
            className="min-w-0 flex-1"
          >
            <motion.ul
              role="list"
              className="space-y-4"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            >
              {/* صف بدء محادثة */}
              {!addOpen && (
                <motion.li variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
                  <motion.button
                    onClick={() => setAddOpen(true)}
                    className="w-full rounded-2xl border p-4 flex items-center gap-4 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    style={rowBase}
                    whileHover={{
                      y: -2,
                      scale: 1.01,
                      boxShadow: "0 16px 36px rgba(27,131,84,0.20)",
                      filter: "brightness(1.02)",
                    }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "tween", ease: EASE, duration: 0.25 }}
                    aria-label="محادثة جديدة"
                    title="محادثة جديدة"
                  >
                    <div
                      className="grid place-content-center size-10 rounded-xl"
                      style={{ background: "color-mix(in oklab, var(--brand) 14%, transparent)" }}
                    >
                      <Plus className="size-6" style={{ color: "var(--brand)" }} />
                    </div>
                    <div className="font-medium">محادثة جديدة</div>
                  </motion.button>
                </motion.li>
              )}

              {/* صفوف المحادثات */}
              {(items ?? []).map((p) => (
                <motion.li key={p.id} layout variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
                  <motion.button
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="w-full rounded-2xl border p-4 sm:p-5 flex items-center gap-4 sm:gap-5 overflow-hidden text-right focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    style={rowBase}
                    whileHover={{
                      y: -2,
                      scale: 1.01,
                      boxShadow: "0 16px 36px rgba(27,131,84,0.18)",
                      filter: "brightness(1.02)",
                    }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "tween", ease: EASE, duration: 0.25 }}
                    aria-label={p.name}
                    title={p.name}
                  >
                    <ScoreRing value={p.score ?? 0} ease={EASE} />

                    <div className="flex-1 min-w-0" dir="rtl">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold truncate">{p.name}</h3>
                        {p.updatedAt && (
                          <time
                            className="text-xs whitespace-nowrap"
                            style={{ color: "var(--subtext-light)" }}
                            dateTime={p.updatedAt}
                            title={new Date(p.updatedAt).toLocaleString("ar-SA")}
                          >
                            {timeAgo(p.updatedAt)}
                          </time>
                        )}
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <Line width="76%" />
                        <Line width="58%" dim />
                      </div>

                      <div
                        className="mt-2 rounded-md px-2 py-1.5 text-[12px] sm:text-[13px] truncate"
                        style={{
                          background: "color-mix(in oklab, var(--foreground) 10%, transparent)",
                          color: "var(--foreground)",
                        }}
                        title={p.lastMessage || ""}
                      >
                        {p.lastMessage || "…"}
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.preventDefault(); startRename(p); }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                      style={{ color: "var(--subtext-light)" }}
                      aria-label="إعادة تسمية"
                      title="إعادة تسمية"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </motion.button>

                  {renamingId === p.id && (
                    <div className="mt-2 flex items-center justify-start gap-2" dir="rtl">
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-9 w-60 text-center"
                        style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
                      />
                      <Button size="sm" onClick={() => void commitRename()} className="h-9" style={{ background: "var(--brand)", color: "#fff" }}>
                        حفظ
                      </Button>
                      <Button size="sm" variant="ghost" className="h-9" onClick={() => setRenamingId(null)} style={{ color: "var(--subtext-light)" }}>
                        إلغاء
                      </Button>
                    </div>
                  )}
                </motion.li>
              ))}

              {items && items.length === 0 && !loading && (
                <li className="text-sm" style={{ color: "var(--subtext-light)" }}>لا توجد مشاريع بعد.</li>
              )}
            </motion.ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ===== Utilities ===== */
function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `${m} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} س`;
  const d = Math.round(h / 24);
  return `${d} ي`;
}

function Line({ width = "70%", dim = false }: { width?: string; dim?: boolean }) {
  return (
    <motion.div
      className="h-2.5 rounded-full"
      style={{
        width,
        background: dim
          ? "color-mix(in oklab, var(--foreground) 12%, transparent)"
          : "color-mix(in oklab, var(--foreground) 18%, transparent)",
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "tween", duration: 0.15 }}
    />
  );
}

function ScoreRing({ value, ease }: { value: number; ease: number[] }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="shrink-0">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} stroke="color-mix(in oklab, var(--border) 80%, transparent)" strokeWidth="6" fill="none" />
        <motion.circle
          cx="26" cy="26" r={r} stroke="var(--brand)" strokeWidth="6" fill="none" strokeLinecap="round"
          initial={{ strokeDasharray: c, strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ type: "tween", ease, duration: 0.8 }}
        />
        <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="600" style={{ fill: "var(--foreground)" }}>
          {pct}%
        </text>
      </svg>
    </div>
  );
}
