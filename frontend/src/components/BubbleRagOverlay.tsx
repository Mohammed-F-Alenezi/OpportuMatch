"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RagChatSection from "@/components/RagChatSection";

const EASE = [0.25, 1, 0.5, 1] as const;

export default function BubbleRagOverlay({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  // lock scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  // close with Escape
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
          {/* Backdrop */}
          <motion.div
            key="rag-backdrop"
            className="fixed inset-0 z-[80] will-change-opacity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", ease: EASE, duration: 0.28 }}
            style={{
              background: "color-mix(in oklab, var(--background) 55%, black)",
              backdropFilter: "blur(6px)",
            }}
            onClick={onClose}
          />

          {/* Shared-layout SHELL only (no content here) */}
          <motion.div
            key="rag-shell"
            layoutId="rag-orb"
            className="fixed inset-0 md:inset-6 z-[90] border overflow-hidden transform-gpu will-change-transform will-change-opacity rounded-none md:rounded-[28px]"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ borderRadius: 9999, opacity: 0 }}
            transition={{ type: "tween", ease: EASE, duration: 0.32 }}
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
            {/* CONTENT LAYER fills the shell; shows after shell expands */}
            <motion.div
              className="absolute inset-0 grid"
              style={{ gridTemplateRows: "auto 1fr" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "tween", ease: EASE, duration: 0.22, delay: 0.18 }} // <- delay avoids half title
            >
              {/* Top bar */}
              <div
                dir="rtl"
                className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b"
                style={{
                  borderColor: "var(--border)",
                  background: "transparent",
                  backdropFilter: "blur(4px)",
                }}
              >
                {/* Make title flexible and non-clipping */}
                <div className="font-semibold flex-1 min-w-0">
                  <span className="block truncate">المساعد الذكي (RAG)</span>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-lg border px-3 py-1 text-sm"
                  style={{ borderColor: "var(--border)" }}
                >
                  إغلاق
                </button>
              </div>

              {/* Scrollable content */}
              <motion.div
                key="rag-content"
                className="relative z-10 overflow-auto p-4 sm:p-6"
                initial={{ y: 6, scale: 0.995 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 6, scale: 0.995 }}
                transition={{ type: "tween", ease: EASE, duration: 0.22, delay: 0.18 }}
              >
                <RagChatSection />
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
