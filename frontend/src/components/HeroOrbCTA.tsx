"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

export default function HeroOrbCTA({
  label = "حسّن مشروعك",
  size = 72,
  onOpen,
}: { label?: string; size?: number; onOpen?: () => void }) {
  const [hovered, setHovered] = useState(false);

  // static glow (unchanged during animation)
  const glow = useMemo(
    () => ({
      background:
        "radial-gradient(circle at 40% 35%, rgba(59,255,155,.25), transparent 35%)," +
        "radial-gradient(circle at 60% 65%, rgba(0,255,200,.20), transparent 40%)," +
        "radial-gradient(circle at 50% 50%, rgba(16,255,120,.18), rgba(0,0,0,0) 60%)",
      boxShadow:
        "0 0 34px rgba(16,255,120,.18), 0 0 90px rgba(16,255,120,.10), inset 0 0 36px rgba(0,255,180,.12)",
    }),
    []
  );

  function handleTouch() {
    setHovered(true);
    setTimeout(() => setHovered(false), 900);
  }

  return (
    <motion.button
      type="button"
      dir="rtl"
      aria-label={label}
      onClick={() => onOpen?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onBlur={() => setHovered(false)}
      onTouchStart={handleTouch}
      layoutId="rag-orb"
      layout
      animate={{
        width: hovered ? size * 1.85 : size,
        height: hovered ? size * 0.92 : size,
        borderRadius: hovered ? 20 : size / 2,
      }}
      transition={{ type: "spring", stiffness: 120, damping: 26, bounce: 0.06 }}
      className="relative overflow-hidden border transform-gpu will-change-transform"
      style={{
        ...glow,
        borderColor: "color-mix(in oklab, var(--ring) 35%, var(--border))",
        backgroundColor: "color-mix(in oklab, var(--brand) 3%, var(--card))",
        animation: "orbIdle 8s ease-in-out infinite",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          filter: "blur(16px)",
          boxShadow: "0 0 44px rgba(16,255,120,.16), 0 0 120px rgba(16,255,120,.14)",
        }}
      />
      <motion.span
        className="relative z-10 px-4 text-sm font-semibold whitespace-nowrap"
        style={{ color: "var(--foreground)" }}
        animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {label}
      </motion.span>

      <style jsx>{`
        @keyframes orbIdle {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          25%      { transform: translate3d(1px,-2px,0) scale(1.01); }
          50%      { transform: translate3d(0,2px,0) scale(1); }
          75%      { transform: translate3d(-1px,-1px,0) scale(0.99); }
        }
      `}</style>
    </motion.button>
  );
}