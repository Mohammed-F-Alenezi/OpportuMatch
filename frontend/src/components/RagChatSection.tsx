// components/RagChatSection.tsx
"use client";

import type { Socket } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Copy, RefreshCcw } from "lucide-react";
import MarkdownBubble from "@/components/MarkdownBubble"; // <<— الجديد

type Msg = { id: string; role: "user" | "ai"; content: string; citations?: string[] };
type Mood = "idle" | "smile" | "thinking";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? "/rag";
const api = (path: string) => `${API_BASE}${API_PREFIX}${path}`;

export default function RagChatSection({ matchResultId }: { matchResultId?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m1", role: "ai", content: "مرحبًا 👋 أنا راشد. صف مشروعك (القطاع/المرحلة/التمويل) وسأرشّح برامج مناسبة. سأقوم بالتهيئة تلقائيًا الآن." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");

  const socketRef = useRef<Socket | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);

  const [initialized, setInitialized] = useState(false);
  const [initInfo, setInitInfo] = useState<{ source_url?: string; chunks_indexed?: number } | null>(null);
  const [activeMrid, setActiveMrid] = useState<string>((matchResultId ?? "").trim());
  const didAutoInit = useRef(false);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const EASE: number[] = [0.22, 1, 0.36, 1];

  // Autoscroll feed
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (loading) setMood("thinking");
    else if (input.trim()) setMood("smile");
    else setMood("idle");
  }, [input, loading]);

  useEffect(() => setActiveMrid((matchResultId ?? "").trim()), [matchResultId]);

  useEffect(() => {
    const mrid = (activeMrid || "").trim();
    if (!mrid || didAutoInit.current) return;
    didAutoInit.current = true;
    void initFromMatchResult(mrid, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMrid]);

  function paste(txt: string) { setInput((p) => (p.trim() ? `${p} ${txt}` : txt)); }

  async function copyAll() {
    const txt = messages.map((m) => `${m.role === "user" ? "أنت" : "المساعد"}:\n${m.content}`).join("\n\n");
    await navigator.clipboard.writeText(txt);
  }

  function clearAll() { setMessages((m) => [m[0]]); setInput(""); }

  async function initFromMatchResult(idFromCaller: string, hardReset = false) {
    const mrid = (idFromCaller || "").trim();
    if (!mrid) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: "لا يوجد Match Result ID — لا يمكن التهيئة." }]);
      return;
    }
    try {
      setLoading(true);
      if (hardReset) {
        setInitialized(false);
        setInitInfo(null);
        setSummaryOpen(false);
        setSummaryText(null);
        setMessages((m) => [m[0], { id: crypto.randomUUID(), role: "user", content: `ابدأ التهيئة تلقائيًا لمعرّف المطابقة: ${mrid}` }]);
      }
      const res = await fetch(api("/init"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_result_id: mrid }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInitialized(true);
      setInitInfo({ source_url: data?.source_url, chunks_indexed: data?.chunks_indexed });
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: data?.source_url ? `تمت التهيئة ✓ — مصدر: ${data.source_url} · المقاطع: ${data?.chunks_indexed ?? 0}` : "تمت التهيئة ✓ — لا يوجد مصدر لهذه المطابقة." }]);
    } catch (e: any) {
      didAutoInit.current = false;
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: `فشل التهيئة: ${e?.message || e}` }]);
    } finally { setLoading(false); }
  }

  async function fetchSummary() {
    const mrid = (activeMrid || "").trim();
    if (!mrid) return;
    const res = await fetch(api("/summary"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_result_id: mrid }) });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setSummaryText(data?.summary || "");
  }

  async function toggleSummary() {
    if (!initialized) { setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: "ابدأ بالتهيئة أولًا (تتم تلقائيًا)…" }]); return; }
    if (summaryOpen) return setSummaryOpen(false);
    try { setLoading(true); await fetchSummary(); setSummaryOpen(true); }
    catch (e: any) { setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: `تعذّر التلخيص: ${e?.message || e}` }]); }
    finally { setLoading(false); }
  }

  async function refreshSummaryIfOpen() { if (summaryOpen) { try { await fetchSummary(); } catch {} } }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const mrid = (activeMrid || "").trim();
    if (!initialized || !mrid) { setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: "التهيئة قيد الانتظار… لحظات." }]); return; }
    const newUser: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, newUser]); setInput(""); setLoading(true);
    try {
      const res = await fetch(api("/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_result_id: mrid, message: text }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const aiMsg: Msg = { id: crypto.randomUUID(), role: "ai", content: data?.reply || "—", citations: Array.isArray(data?.citations) ? data.citations : undefined };
      setMessages((m) => [...m, aiMsg]);
      await refreshSummaryIfOpen();
    } catch (e: any) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: `حصل خطأ أثناء المعالجة: ${e?.message || e}` }]);
    } finally { setLoading(false); }
  }

  return (
    <div dir="rtl" className="relative w-full h-full min-h-0 grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>
      {/* CENTER — chat */}
      <section className="relative min-w-0 min-h-0 flex flex-col z-10">
        <div
          className="relative rounded-[24px] h-full min-h-0 overflow-hidden"
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            background: "color-mix(in oklab, var(--card) 84%, transparent)",
            border: "1px solid var(--border)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.05), 0 20px 56px rgba(0,0,0,.22), 0 0 0 1px color-mix(in oklab, var(--brand) 8%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* toolbar */}
          <div className="px-4 md:px-5 py-3 border-b" style={{ background:"linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 90%, transparent))", borderColor:"var(--border)", backdropFilter:"blur(8px)" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center w-9 h-9 rounded-xl" style={{ background:"color-mix(in oklab, var(--brand) 18%, transparent)", boxShadow:"0 10px 30px rgba(27,131,84,.22)" }}>
                  <Bot className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="font-semibold">المساعد الذكي</div>
                  <div className="text-xs opacity-70">مطابقة البرامج • واجهة</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ToolbarGhost icon={<Copy className="w-3.5 h-3.5" />} text="نسخ" onClick={copyAll} />
                <ToolbarGhost icon={<RefreshCcw className="w-3.5 h-3.5" />} text="تفريغ" onClick={clearAll} />
                <div className="flex items-center gap-1 text-xs" aria-label="Rashid status">
                  <RashidFace mood={mood} size={22} />
                  <span className="opacity-75">راشد</span>
                </div>
              </div>
            </div>
          </div>

          {/* FEED */}
          <div
            ref={feedRef}
            className="min-h-0 overflow-y-auto px-4 md:px-5 pt-4 pb-4 space-y-4 custom-scroll"
            style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" as any }}
          >
            {messages.map((m) => {
              const bubbleBase =
                "group relative max-w-[86%] rounded-2xl p-3 text-[15px] leading-7";
              const isUser = m.role === "user";
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className={`${bubbleBase} ${isUser ? "ml-auto" : ""}`}
                  style={{
                    background: isUser
                      ? "linear-gradient(180deg, color-mix(in oklab, var(--brand) 26%, var(--card)), color-mix(in oklab, var(--brand) 18%, var(--card)))"
                      : "linear-gradient(180deg, color-mix(in oklab, var(--card) 98%, transparent), color-mix(in oklab, var(--card) 92%, transparent))",
                    color: isUser ? "white" : "var(--foreground)",
                    boxShadow: isUser
                      ? "0 14px 34px rgba(27,131,84,.24), inset 0 1px 0 rgba(255,255,255,.06)"
                      : "0 12px 28px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.06)",
                  }}
                >
                  <div className="mb-1 text-xs opacity-80">{isUser ? "أنت" : "المساعد"}</div>

                  {/* المحتوى */}
                  {isUser ? (
                    <div style={{ maxWidth: "68ch", whiteSpace: "pre-wrap" }}>
                      {m.content}
                    </div>
                  ) : (
                    <MarkdownBubble text={m.content} rtl />
                  )}

                  {!!m.citations?.length && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.citations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => paste(c)}
                          className="text-[11px] rounded-md px-2 py-1 border hover:opacity-90"
                          style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--card) 88%, transparent)" }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {loading && (
              <div className="relative max-w-[86%] rounded-2xl p-3 text-sm border" style={{ borderColor:"var(--border)", background:"linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 92%, transparent))", boxShadow:"0 10px 26px rgba(0,0,0,.10), inset 0 1px 0 rgba(255,255,255,.05)" }}>
                <div className="mb-1 text-xs opacity-80">المساعد</div>
                <Dots />
              </div>
            )}
          </div>

          {/* COMPOSER */}
          <div className="px-4 md:px-5 pb-4 pt-2 border-t" style={{ borderColor: "var(--border)", background: "linear-gradient(to top, color-mix(in oklab, var(--card) 95%, transparent), transparent)" }}>
            <div className="flex items-end gap-2 rounded-2xl border p-2" style={{ borderColor: "var(--border)", background:"linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 90%, transparent))", boxShadow:"0 22px 48px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.05)", backdropFilter:"blur(8px)" }}>
              <button type="button" className="shrink-0 grid place-items-center rounded-xl border w-11 h-11" style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--card) 94%, transparent)" }} title="راشد — (واجهة فقط)">
                <RashidFace mood={mood} />
              </button>

              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={initialized ? "اكتب رسالتك هنا…" : "جاري التهيئة تلقائيًا…"}
                disabled={!initialized}
                className="flex-1 bg-transparent outline-none text-[15px] resize-none leading-7 px-3 py-2.5 custom-scroll placeholder:opacity-60 disabled:opacity-60"
              />

              <button onClick={send} disabled={loading || !initialized} className="shrink-0 rounded-xl px-4 py-2.5 text-sm text-white font-medium transform-gpu disabled:opacity-60" style={{ background: "var(--brand)", boxShadow: "0 0 26px rgba(27,131,84,.35)" }} title="إرسال">
                إرسال <Send className="w-4 h-4 inline-block" />
              </button>
            </div>

            <div className="mt-2 px-1 text-[11px] opacity-70">
              تلميح: تتم التهيئة تلقائيًا عند فتح المحادثة. ستُفعّل الكتابة بعد اكتمالها.
            </div>
          </div>
        </div>
      </section>

      {/* SUMMARY RAIL */}
      <aside className="hidden lg:flex flex-col rounded-3xl overflow-hidden z-0" style={{ background: "color-mix(in oklab, var(--card) 88%, transparent)", border: "1px solid var(--border)", boxShadow: "0 12px 32px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.05)", backdropFilter: "blur(6px)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="font-semibold">سياق مُسترجَع</div>
            <motion.button
              onClick={() => {
                if (!initialized) {
                  setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: "ابدأ بالتهيئة أولًا (تتم تلقائيًا)…" }]);
                  return;
                }
                if (summaryOpen) setSummaryOpen(false);
                else fetchSummary().then(() => setSummaryOpen(true)).catch((e) =>
                  setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: `تعذّر التلخيص: ${e?.message || e}` }])
                );
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl px-3 py-1.5 text-xs font-medium border transition-all duration-200 hover:shadow-md hover:bg-[var(--brand)] hover:text-white"
              style={{ borderColor: "var(--border)", background: summaryOpen ? "var(--brand)" : "transparent", color: summaryOpen ? "white" : "inherit" }}
              title="تلخيص المحادثة"
            >
              تلخيص
            </motion.button>
          </div>
          <div className="text-xs opacity-70 mt-1">
            {initialized
              ? initInfo?.source_url
                ? `المصدر: ${initInfo.source_url} • مقاطع: ${initInfo?.chunks_indexed ?? 0}`
                : "لا يوجد مصدر في match_results"
              : "جاري التهيئة تلقائيًا…"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scroll">
          {summaryOpen && summaryText && (
            <ContextCard title="ملخّص المحادثة">
              <div style={{ whiteSpace: "pre-wrap" }}>{summaryText}</div>
            </ContextCard>
          )}
        </div>
      </aside>

      {/* responsive */}
      <style jsx>{`
        @media (max-width: 1024px) {
          div[dir="rtl"].relative.w-full.h-full.min-h-0.grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* scrollbars */}
      <style jsx global>{`
        .custom-scroll { scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
        .custom-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: color-mix(in oklab, var(--border) 80%, transparent); border-radius: 999px; }
      `}</style>
    </div>
  );
}

/* mini components… (unchanged) */
function ToolbarGhost({ icon, text, onClick }: { icon: React.ReactNode; text: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:opacity-90" style={{ borderColor: "var(--border)", background: "transparent" }}>
      {icon}{text}
    </button>
  );
}

function ContextCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background:"linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 90%, transparent))", border:"1px solid var(--border)", boxShadow:"0 12px 30px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.05)", backdropFilter:"blur(8px)" }}>
      <div className="text-xs font-semibold mb-1">{title}</div>
      <div className="text-xs opacity-80 leading-6">{children}</div>
    </div>
  );
}

function RashidFace({ mood, size = 36 }: { mood: Mood; size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <motion.svg viewBox="0 0 64 64" className="block" style={{ width: "100%", height: "100%" }} initial={false} animate={mood === "thinking" ? { rotate: [-2, 2, -2], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } } : { rotate: 0 }}>
        <motion.circle cx="32" cy="32" r="28" fill="url(#skin)" stroke="color-mix(in oklab, var(--border) 80%, transparent)" strokeWidth="1" animate={mood !== "thinking" ? { scale: [1, 1.02, 1] } : { scale: 1 }} transition={{ duration: 3, repeat: Infinity }} />
        <g fill="currentColor">{mood === "smile" ? (<><path d="M20 28 q4 6 8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M36 28 q4 6 8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></>) : (<><circle cx="24" cy="28" r="2.6" /><circle cx="40" cy="28" r="2.6" /></>)}</g>
        {mood === "smile" && <path d="M22 40 q10 10 20 0" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />}
        {mood === "idle" && <path d="M24 40 h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
        {mood === "thinking" && (<><path d="M24 42 q8 -6 16 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /><motion.circle cx="50" cy="14" r="2" fill="currentColor" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity }} /><motion.circle cx="55" cy="9" r="1.6" fill="currentColor" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.15 }} /></>)}
        <defs><radialGradient id="skin" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="color-mix(in oklab, var(--card) 98%, transparent)" /><stop offset="100%" stopColor="color-mix(in oklab, var(--card) 85%, var(--brand))" /></radialGradient></defs>
      </motion.svg>
    </div>
  );
}

function Dots() {
  return (
    <div className="flex items-center gap-1">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <style jsx>{`
        .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; background: color-mix(in oklab, var(--foreground) 80%, transparent); opacity: 0.6; animation: pulseDot 1.2s infinite ease-in-out; }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes pulseDot { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-3px); opacity: 0.9; } }
      `}</style>
    </div>
  );
}
