"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Send,
  Copy,
  RefreshCcw,
  Eye,
  Mic,
  Volume2,
  PauseCircle,
  AlertCircle,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

type Msg = { id: string; role: "user" | "ai"; content: string; citations?: string[] };
type Mood = "idle" | "smile" | "thinking";

const WS_URL = process.env.NEXT_PUBLIC_RASHID_WS_URL || "http://localhost:5000";

export default function RagChatSection() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m1",
      role: "ai",
      content:
        "مرحبًا، أنا راشد. صف مشروعك (القطاع/المرحلة/التمويل) وسأرشّح برامج مناسبة.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");

  // Rashid vision/voice state
  const [avatarSrc, setAvatarSrc] = useState("/assets/avatar.png");
  const [present, setPresent] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [micHint, setMicHint] = useState("Idle. Waiting for a person in front of the camera.");
  const [voiceOn, setVoiceOn] = useState(false); // toggle by clicking RashidFace

  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const EASE: number[] = [0.22, 1, 0.36, 1];

  // Auto scroll feed
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Mood logic
  useEffect(() => {
    if (loading) setMood("thinking");
    else if (input.trim()) setMood("smile");
    else setMood("idle");
  }, [input, loading]);

  // Socket wiring
  useEffect(() => {
    const s = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("video_frame", ({ frame }) => setAvatarSrc(`data:image/jpeg;base64,${frame}`));
    s.on("presence", ({ present }) => setPresent(!!present));
    s.on("speak_state", ({ speaking }) => setSpeaking(!!speaking));

    s.on("server_response", ({ data }) => {
      if (typeof data === "string" && data.trim()) {
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: data.trim() }]);
      }
    });

    s.on("voice_response", ({ text }) => {
      if (typeof text === "string" && text.trim()) {
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: "ai", content: text.trim() }]);
        if ("speechSynthesis" in window && voiceOn) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "ar-SA";
          window.speechSynthesis.speak(u);
        }
      }
    });

    s.emit("start_stream");

    return () => {
      try { s.disconnect(); } catch {}
      try { (recRef.current as any)?.abort(); } catch {}
      window.speechSynthesis?.cancel();
    };
  }, [voiceOn]);

  // ASR helpers
  function ensureASR() {
    if (recRef.current) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMicHint("Browser does not support SpeechRecognition. Use Chrome on https or localhost.");
      return;
    }
    const r: SpeechRecognition = new SR();
    r.lang = "ar-SA";
    (r as any).continuous = true;
    (r as any).interimResults = false;

    r.onstart = () => setMicHint("Listening.");
    r.onend = () => {
      if (voiceOn && present && !speaking) {
        try { r.start(); } catch {}
      }
    };
    r.onerror = () => {
      if (voiceOn && present && !speaking) {
        setTimeout(() => { try { r.start(); } catch {} }, 350);
      }
    };
    r.onresult = (e: any) => {
      const txt = (e.results?.[e.resultIndex]?.[0]?.transcript || "").trim();
      if (!txt) return;
      socketRef.current?.emit("voice_input", { text: txt });
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: txt }]);
    };

    recRef.current = r;
  }

  function updateMicState() {
    if (!voiceOn) {
      setMicHint("Voice is off. Click Rashid to enable.");
      try { (recRef.current as any)?.abort(); } catch {}
      return;
    }
    if (speaking) {
      setMicHint("Rashid is speaking.");
      try { (recRef.current as any)?.abort(); } catch {}
      return;
    }
    if (!present) {
      setMicHint("Idle. Waiting for a person in front of the camera.");
      try { (recRef.current as any)?.abort(); } catch {}
      return;
    }
    ensureASR();
    setMicHint("Listening.");
    try { recRef.current?.start(); } catch {}
  }

  useEffect(() => {
    updateMicState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceOn, present, speaking]);

  // Chat actions
  function paste(txt: string) {
    setInput((p) => (p.trim() ? `${p} ${txt}` : txt));
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function copyAll() {
    const txt = messages.map((m) => `${m.role === "user" ? "أنت" : "المساعد"}:\n${m.content}`).join("\n\n");
    navigator.clipboard.writeText(txt);
  }

  function clearAll() {
    setMessages((m) => [m[0]]);
    setInput("");
  }

  function send() {
    const text = input.trim();
    if (!text || loading) return;

    // echo locally
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text }]);
    setInput("");
    setLoading(true);

    // send to backend
    socketRef.current?.emit("user_text", { text });

    setLoading(false);
  }

  return (
    <div dir="rtl" className="relative h-full w-full grid" style={{ gridTemplateColumns: "1fr 300px" }}>
      {/* CENTER — chat */}
      <section className="relative min-w-0 flex flex-col">
        <div
          className="relative rounded-[24px] overflow-hidden"
          style={{
            background: "color-mix(in oklab, var(--card) 84%, transparent)",
            border: "1px solid var(--border)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.05), 0 18px 50px rgba(0,0,0,.18), 0 0 0 1px color-mix(in oklab, var(--brand) 8%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* toolbar */}
          <div
            className="sticky top-0 z-10 px-4 md:px-5 py-3 border-b"
            style={{
              background: "linear-gradient(180deg, color-mix(in oklab, var(--card) 92%, transparent), color-mix(in oklab, var(--card) 86%, transparent))",
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
                <ToolbarGhost icon={<Copy className="w-3.5 h-3.5" />} text="نسخ" onClick={copyAll} />
                <ToolbarGhost icon={<RefreshCcw className="w-3.5 h-3.5" />} text="تفريغ" onClick={clearAll} />
                <div className="flex items-center gap-1 text-xs">
                  <RashidFace mood={mood} size={22} />
                  <span className="opacity-75">راشد</span>
                </div>
              </div>
            </div>
          </div>

          {/* FEED */}
          <div ref={feedRef} className="flex-1 overflow-y-auto px-4 md:px-5 pb-28 pt-4 space-y-4 custom-scroll">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
                className={`group relative max-w-[86%] rounded-2xl p-3 text-sm leading-7 ${m.role === "user" ? "ml-auto" : ""}`}
                style={{
                  background:
                    m.role === "user"
                      ? "linear-gradient(180deg, color-mix(in oklab, var(--brand) 22%, var(--card)), color-mix(in oklab, var(--brand) 16%, var(--card)))"
                      : "linear-gradient(180deg, color-mix(in oklab, var(--card) 97%, transparent), color-mix(in oklab, var(--card) 90%, transparent))",
                  color: m.role === "user" ? "white" : "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="mb-1 text-xs opacity-80">{m.role === "ai" ? "المساعد" : "أنت"}</div>
                <div style={{ maxWidth: "68ch" }}>{m.content}</div>
              </motion.div>
            ))}

            {loading && (
              <div className="relative max-w-[86%] rounded-2xl p-3 text-sm border"
                   style={{ borderColor: "var(--border)", background: "linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 92%, transparent))" }}>
                <div className="mb-1 text-xs opacity-80">المساعد</div>
                <Dots />
              </div>
            )}
          </div>

          {/* COMPOSER */}
          <div className="absolute bottom-0 inset-x-0 px-4 md:px-5 pb-4 pt-2"
               style={{ background: "linear-gradient(to top, color-mix(in oklab, var(--card) 95%, transparent), transparent)" }}>
            <div className="flex items-end gap-2 rounded-2xl border p-2"
                 style={{ borderColor: "var(--border)", background: "linear-gradient(180deg, color-mix(in oklab, var(--card) 96%, transparent), color-mix(in oklab, var(--card) 90%, transparent))" }}>
              {/* Rashid toggle */}
              <button
                type="button"
                className="shrink-0 grid place-items-center rounded-xl border w-11 h-11"
                style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--card) 94%, transparent)" }}
                onClick={() => setVoiceOn(v => !v)}
                title="Toggle Rashid voice mode"
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
                className="flex-1 bg-transparent outline-none text-sm resize-none leading-6 px-2 py-2 custom-scroll"
              />

              <button
                onClick={send}
                disabled={loading}
                className="shrink-0 rounded-xl px-3 py-2 text-sm text-white"
                style={{ background: "var(--brand)" }}
              >
                <div className="flex items-center gap-1">
                  إرسال <Send className="w-4 h-4" />
                </div>
              </button>
            </div>
            <div className="mt-2 px-1 text-[11px] opacity-70">{micHint}</div>
          </div>
        </div>
      </section>

      {/* RIGHT — Rashid Vision panel */}
      <aside className="hidden lg:flex flex-col rounded-3xl ml-3 overflow-hidden"
             style={{ background: "color-mix(in oklab, var(--card) 88%, transparent)", border: "1px solid var(--border)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="font-semibold">Rashid Vision</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scroll">
          <div className="w-full aspect-video rounded-xl overflow-hidden border"
               style={{ borderColor: "var(--border)" }}>
            <img src={avatarSrc} alt="Rashid" className="w-full h-full object-contain bg-black" />
          </div>
          <div className="text-xs opacity-80 flex items-center gap-1">
            {speaking ? <><Volume2 className="w-4 h-4" /> Speaking…</> :
             present ? <><Mic className="w-4 h-4" /> Listening…</> :
             <><PauseCircle className="w-4 h-4" /> Idle</>}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* helpers */
function ToolbarGhost({ icon, text, onClick }: { icon: React.ReactNode; text: string; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:opacity-90"
      style={{ borderColor: "var(--border)", background: "transparent" }}>
      {icon}{text}
    </button>
  );
}

/* Rashid face */
function RashidFace({ mood, size = 36 }: { mood: Mood; size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <motion.svg viewBox="0 0 64 64" className="block" style={{ width: "100%", height: "100%" }}
        initial={false}
        animate={mood === "thinking" ? { rotate: [-2, 2, -2], transition: { duration: 1.6, repeat: Infinity } } : { rotate: 0 }}>
        <motion.circle cx="32" cy="32" r="28" fill="url(#skin)"
          stroke="color-mix(in oklab, var(--border) 80%, transparent)" strokeWidth="1"
          animate={mood !== "thinking" ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 3, repeat: Infinity }} />
        <g fill="currentColor">
          {mood === "smile"
            ? (<><path d="M20 28 q4 6 8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M36 28 q4 6 8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></>)
            : (<><circle cx="24" cy="28" r="2.6" /><circle cx="40" cy="28" r="2.6" /></>)
          }
        </g>
        {mood === "smile" && <path d="M22 40 q10 10 20 0" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />}
        {mood === "idle" && <path d="M24 40 h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
        <defs>
          <radialGradient id="skin" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--card) 98%, transparent)" />
            <stop offset="100%" stopColor="color-mix(in oklab, var(--card) 85%, var(--brand))" />
          </radialGradient>
        </defs>
      </motion.svg>
    </div>
  );
}

function Dots() {
  return (
    <div className="flex items-center gap-1">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <style jsx>{`
        .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block;
          background: color-mix(in oklab, var(--foreground) 80%, transparent); opacity: .6;
          animation: pulseDot 1.2s infinite ease-in-out; }
        .dot:nth-child(2) { animation-delay: .15s; }
        .dot:nth-child(3) { animation-delay: .30s; }
        @keyframes pulseDot { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-3px);opacity:.9} }
      `}</style>
    </div>
  );
}
