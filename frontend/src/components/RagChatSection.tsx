"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Copy, RefreshCcw } from "lucide-react";

type Msg = { id: string; role: "user" | "ai"; content: string; citations?: string[] };
type Mood = "idle" | "smile" | "thinking";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RagChatSection() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m1",
      role: "ai",
      content:
        "مرحبًا 👋 أنا راشد. صف مشروعك (القطاع/المرحلة/التمويل) وسأرشح برامج مناسبة.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [matchResultId, setMatchResultId] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [initInfo, setInitInfo] =
    useState<{ source_url?: string; chunks_indexed?: number } | null>(null);

  const EASE: number[] = [0.22, 1, 0.36, 1];

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (loading) setMood("thinking");
    else if (input.trim()) setMood("smile");
    else setMood("idle");
  }, [input, loading]);

  function paste(txt: string) {
    setInput((p) => (p.trim() ? `${p} ${txt}` : txt));
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function copyAll() {
    const txt = messages
      .map((m) => `${m.role === "user" ? "أنت" : "المساعد"}:\n${m.content}`)
      .join("\n\n");
    await navigator.clipboard.writeText(txt);
  }

  function clearAll() {
    setMessages((m) => [m[0]]);
    setInput("");
  }

  async function initFromMatchResult() {
    const mrid = matchResultId.trim();
    if (!mrid) {
      alert("أدخل Match Result ID أولًا");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_result_id: mrid }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInitialized(true);
      setInitInfo({
        source_url: data?.source_url,
        chunks_indexed: data?.chunks_indexed,
      });
    } catch (e: any) {
      alert(`فشل التهيئة: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (!initialized) {
      alert("ابدأ بالتهيئة من Match Result ID أولًا.");
      return;
    }
    const newUser: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, newUser]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_result_id: matchResultId, message: text }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const aiMsg: Msg = {
        id: crypto.randomUUID(),
        role: "ai",
        content: data?.reply || "—",
        citations: Array.isArray(data?.citations) ? data.citations : undefined,
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (e: any) {
      const err: Msg = {
        id: crypto.randomUUID(),
        role: "ai",
        content: `حصل خطأ أثناء المعالجة: ${e?.message || e}`,
      };
      setMessages((m) => [...m, err]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="relative h-full w-full grid gap-4" /* GAP adds spacing */
      style={{ gridTemplateColumns: "1fr 300px" }}
    >
      {/* CENTER — chat (on top for depth) */}
      <section className="relative min-w-0 flex flex-col z-10">
        {/* shell */}
        <div
          className="relative rounded-[24px] overflow-hidden"
          style={{
            background: "color-mix(in oklab, var(--card) 84%, transparent)",
            border: "1px solid var(--border)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.05), 0 20px 56px rgba(0,0,0,.22), 0 0 0 1px color-mix(in oklab, var(--brand) 8%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* toolbar */}
          <div
            className="sticky top-0 z-10 px-4 md:px-5 py-3 border-b"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 90%, transparent))",
              borderColor: "var(--border)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="grid place-items-center w-9 h-9 rounded-xl"
                  style={{
                    background: "color-mix(in oklab, var(--brand) 18%, transparent)",
                    boxShadow: "0 10px 30px rgba(27,131,84,.22)",
                  }}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="font-semibold">المساعد الذكي</div>
                  <div className="text-xs opacity-70">مطابقة البرامج • واجهة</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ToolbarGhost
                  icon={<Copy className="w-3.5 h-3.5" />}
                  text="نسخ"
                  onClick={copyAll}
                />
                <ToolbarGhost
                  icon={<RefreshCcw className="w-3.5 h-3.5" />}
                  text="تفريغ"
                  onClick={clearAll}
                />
                <div className="flex items-center gap-1 text-xs" aria-label="Rashid status">
                  <RashidFace mood={mood} size={22} />
                  <span className="opacity-75">راشد</span>
                </div>
              </div>
            </div>
          </div>

          {/* init bar */}
          <div
            className="px-4 md:px-5 py-2 flex flex-wrap items-center gap-2 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <input
              value={matchResultId}
              onChange={(e) => setMatchResultId(e.target.value)}
              placeholder="Match Result ID"
              className="rounded-xl border px-3 py-2 text-xs bg-transparent w-48 focus:outline-none"
              style={{ borderColor: "var(--border)" }}
              aria-label="Match Result ID"
            />
            <button
              onClick={initFromMatchResult}
              disabled={loading}
              className="rounded-xl px-3 py-2 text-xs font-medium hover:opacity-90"
              style={{
                border: "1px solid var(--border)",
                background: "color-mix(in oklab, var(--brand) 14%, var(--card))",
              }}
            >
              تهيئة
            </button>

            {initialized && (
              <span className="text-[11px] opacity-80">
                تم — {initInfo?.source_url ? "تم تحميل المصدر" : "لا يوجد مصدر"} •
                مقاطع: {initInfo?.chunks_indexed ?? 0}
              </span>
            )}
          </div>

          {/* FEED */}
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto px-4 md:px-5 pb-36 pt-4 space-y-4 custom-scroll"
          >
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
                className={`group relative max-w-[86%] rounded-2xl p-3 text-[15px] leading-7 ${
                  m.role === "user" ? "ml-auto" : ""
                }`}
                style={{
                  background:
                    m.role === "user"
                      ? "linear-gradient(180deg, color-mix(in oklab, var(--brand) 26%, var(--card)), color-mix(in oklab, var(--brand) 18%, var(--card)))"
                      : "linear-gradient(180deg, color-mix(in oklab, var(--card) 98%, transparent), color-mix(in oklab, var(--card) 92%, transparent))",
                  color: m.role === "user" ? "white" : "var(--foreground)",
                 
                  boxShadow:
                    m.role === "user"
                      ? "0 14px 34px rgba(27,131,84,.24), inset 0 1px 0 rgba(255,255,255,.06)"
                      : "0 12px 28px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.06)",
                }}
              >
                <div className="mb-1 text-xs opacity-80">
                  {m.role === "ai" ? "المساعد" : "أنت"}
                </div>

                
                <div style={{ maxWidth: "68ch" }}>{m.content}</div>

                {!!m.citations?.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.citations.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => paste(c)}
                        className="text-[11px] rounded-md px-2 py-1 border hover:opacity-90"
                        style={{
                          borderColor: "var(--border)",
                          background:
                            "color-mix(in oklab, var(--card) 88%, transparent)",
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}

            {/* TEMPLATE QUESTIONS — now above composer */}
<div className="mt-6 mb-4 flex flex-wrap items-center gap-3 px-4 md:px-5">
  {[
    "أنا متجر إلكتروني للمنتجات الحرفية وأحتاج تمويلًا مبكرًا",
    "مشروعي في مرحلة نموذج أولي — ما البرامج المناسبة؟",
    "هل يتوافق مشروعي مع شروط منشآت؟",
  ].map((s, i) => (
    <button
      key={i}
      onClick={() => paste(s)}
      className="rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
      style={{
        background: "var(--brand)",
        color: "white",
        border:
          "1px solid color-mix(in oklab, var(--brand) 50%, var(--border))",
        boxShadow: "0 6px 16px rgba(27,131,84,.28)",
      }}
    >
      {s}
    </button>
  ))}
</div>


            {loading && (
              <div
                className="relative max-w-[86%] rounded-2xl p-3 text-sm border"
                style={{
                  borderColor: "var(--border)",
                  background:
                    "linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 92%, transparent))",
                  boxShadow:
                    "0 10px 26px rgba(0,0,0,.10), inset 0 1px 0 rgba(255,255,255,.05)",
                }}
              >
                <div className="mb-1 text-xs opacity-80">المساعد</div>
                <Dots />
              </div>
            )}
          </div>

          {/* COMPOSER */}
          <div
            className="absolute bottom-0 inset-x-0 px-4 md:px-5 pb-4 pt-2"
            style={{
              background:
                "linear-gradient(to top, color-mix(in oklab, var(--card) 95%, transparent), transparent)",
            }}
          >
            <div
              className="flex items-end gap-2 rounded-2xl border p-2"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 90%, transparent))",
                boxShadow:
                  "0 22px 48px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.05)",
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Rashid face */}
              <button
                type="button"
                className="shrink-0 grid place-items-center rounded-xl border w-11 h-11"
                style={{
                  borderColor: "var(--border)",
                  background: "color-mix(in oklab, var(--card) 94%, transparent)",
                }}
                title="راشد — (واجهة فقط)"
                aria-label="تفعيل وضع راشد"
                onClick={() =>
                  alert("واجهة فقط — سيتم تفعيل وضع راشد لاحقًا.")
                }
              >
                <RashidFace mood={mood} />
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="اكتب رسالتك هنا…"
                className="flex-1 bg-transparent outline-none text-[15px] resize-none leading-7 px-3 py-2.5 custom-scroll placeholder:opacity-60"
              />

              <button
                onClick={send}
                disabled={loading}
                className="shrink-0 rounded-xl px-4 py-2.5 text-sm text-white font-medium transform-gpu disabled:opacity-60"
                style={{
                  background: "var(--brand)",
                  boxShadow: "0 0 26px rgba(27,131,84,.35)",
                }}
                title="إرسال"
              >
                <div className="flex items-center gap-1.5">
                  إرسال <Send className="w-4 h-4" />
                </div>
              </button>
            </div>


            <div className="mt-2 px-1 text-[11px] opacity-70">
              تلميح: راشد يبتسم أثناء الكتابة ويتحوّل إلى التفكير بعد الإرسال.
            </div>
          </div>
        </div>
      </section>

      {/* SUMMARY RAIL — sits "under" chat for depth */}
      <aside
        className="hidden lg:flex flex-col rounded-3xl overflow-hidden z-0"
        /* no margin; the grid gap provides spacing */
        style={{
          background: "color-mix(in oklab, var(--card) 88%, transparent)",
          border: "1px solid var(--border)",
          boxShadow:
            "0 12px 32px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.05)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="font-semibold">سياق مُسترجَع</div>
          <div className="text-xs opacity-70 mt-1">
            {initialized
              ? initInfo?.source_url
                ? `المصدر: ${initInfo.source_url} • مقاطع: ${
                    initInfo?.chunks_indexed ?? 0
                  }`
                : "لا يوجد مصدر في match_results"
              : "ابدأ بالتهيئة من Match Result"}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scroll">
          <ContextCard title="شروط الأهلية">
            • القطاع: تقني/ابتكار
            <br />• المرحلة: فكرة/نموذج أولي
            <br />• التمويل: حتى 250 ألف
          </ContextCard>
          <ContextCard title="توافق الأهداف">
            يركّز البرنامج على بناء النماذج الأولية وتسريع التحقق من الملاءمة
            السوقية.
          </ContextCard>
        </div>
      </aside>

      {/* responsive */}
      <style jsx>{`
        @media (max-width: 1024px) {
          div[dir="rtl"].relative.h-full.w-full.grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* scrollbars */}
      <style jsx global>{`
        .custom-scroll {
          scrollbar-width: thin;
        }
        .custom-scroll::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: color-mix(in oklab, var(--border) 80%, transparent);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}

/* mini components */
function ToolbarGhost({
  icon,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:opacity-90"
      style={{ borderColor: "var(--border)", background: "transparent" }}
    >
      {icon}
      {text}
    </button>
  );
}

function ContextCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 90%, transparent))",
        border: "1px solid var(--border)",
        boxShadow:
          "0 12px 30px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.05)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="text-xs font-semibold mb-1">{title}</div>
      <div className="text-xs opacity-80 leading-6">{children}</div>
    </div>
  );
}

/* راشد face */
function RashidFace({ mood, size = 36 }: { mood: Mood; size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 64 64"
        className="block"
        style={{ width: "100%", height: "100%" }}
        initial={false}
        animate={
          mood === "thinking"
            ? {
                rotate: [-2, 2, -2],
                transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
              }
            : { rotate: 0 }
        }
      >
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          fill="url(#skin)"
          stroke="color-mix(in oklab, var(--border) 80%, transparent)"
          strokeWidth="1"
          animate={mood !== "thinking" ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <g fill="currentColor">
          {mood === "smile" ? (
            <>
              <path
                d="M20 28 q4 6 8 0"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M36 28 q4 6 8 0"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <circle cx="24" cy="28" r="2.6" />
              <circle cx="40" cy="28" r="2.6" />
            </>
          )}
        </g>
        {mood === "smile" && (
          <path
            d="M22 40 q10 10 20 0"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {mood === "idle" && (
          <path d="M24 40 h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
        {mood === "thinking" && (
          <>
            <path
              d="M24 42 q8 -6 16 0"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <motion.circle
              cx="50"
              cy="14"
              r="2"
              fill="currentColor"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <motion.circle
              cx="55"
              cy="9"
              r="1.6"
              fill="currentColor"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.15 }}
            />
          </>
        )}
        {mood === "smile" && (
          <>
            <circle cx="18" cy="36" r="3.5" fill="rgba(255,120,120,.25)" />
            <circle cx="46" cy="36" r="3.5" fill="rgba(255,120,120,.25)" />
          </>
        )}
        <defs>
          <radialGradient id="skin" cx="50%" cy="40%" r="60%">
            <stop
              offset="0%"
              stopColor="color-mix(in oklab, var(--card) 98%, transparent)"
            />
            <stop
              offset="100%"
              stopColor="color-mix(in oklab, var(--card) 85%, var(--brand))"
            />
          </radialGradient>
        </defs>
      </motion.svg>
    </div>
  );
}

function Dots() {
  return (
    <div className="flex items-center gap-1">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <style jsx>{`
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
          background: color-mix(in oklab, var(--foreground) 80%, transparent);
          opacity: 0.6;
          animation: pulseDot 1.2s infinite ease-in-out;
        }
        .dot:nth-child(2) {
          animation-delay: 0.15s;
        }
        .dot:nth-child(3) {
          animation-delay: 0.3s;
        }
        @keyframes pulseDot {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-3px);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}
