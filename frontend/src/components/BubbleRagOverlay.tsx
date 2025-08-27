"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RagChatSection from "@/components/RagChatSection";

export default function BubbleRagOverlay({
  open,
  onClose,
  matchResultId,                 // ✅ NEW
}: {
  open: boolean;
  onClose: () => void;
  matchResultId?: string;        // ✅ NEW
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="rag-backdrop"
            className="fixed inset-0 z-[80] will-change-opacity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.28 }}
            style={{ background: "color-mix(in oklab, var(--background) 55%, black)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />

          <motion.div
            key="rag-container"
            layoutId="rag-orb"
            className="fixed z-[90] overflow-hidden border transform-gpu will-change-transform will-change-opacity"
            initial={false}
            animate={{ top: 12, right: 12, bottom: 12, left: 12, borderRadius: 28, opacity: 1 }}
            exit={{ borderRadius: 9999, opacity: 0 }}
            transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.32 }}
            style={{
              background:
                "radial-gradient(circle at 40% 35%, rgba(59,255,155,.25), transparent 35%)," +
                "radial-gradient(circle at 60% 65%, rgba(0,255,200,.20), transparent 40%)," +
                "radial-gradient(circle at 50% 50%, rgba(16,255,120,.14), rgba(0,0,0,0) 60%)," +
                "color-mix(in oklab, var(--brand, #10ff78) 3%, var(--card, #0f1417))",
              borderColor:
                "color-mix(in oklab, var(--ring, #10ff78) 30%, var(--border, rgba(255,255,255,.06)))",
              boxShadow: "0 28px 90px rgba(0,0,0,.28)",
            }}
          >
            <div className="orb-animated orb-layer-1" />
            <div className="orb-animated orb-layer-2" />

            <div dir="rtl" className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b"
                 style={{ borderColor: "var(--border)", background: "transparent", backdropFilter: "blur(4px)" }}>
              <div className="font-semibold">المساعد الذكي (RAG)</div>
              <button onClick={onClose} className="rounded-lg border px-3 py-1 text-sm" style={{ borderColor: "var(--border)" }}>
                إغلاق
              </button>
            </div>

            <motion.div
              key="rag-content"
              className="relative z-10 h-[calc(100%-56px)] overflow-auto p-4 sm:p-6"
              initial={{ opacity: 0, y: 8, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.995 }}
              transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.25 }}
            >
              {/* ✅ forward the id to the chat */}
              <RagChatSection matchResultId={matchResultId} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
