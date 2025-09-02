"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import AssistantOrb from "@/components/AssistantOrb";
import Signin from "@/components/signin-form";

export default function Page() {
  const dots = useMemo(
    () => [
      { left: "6%", top: "22%" },
      { left: "18%", top: "68%" },
      { left: "32%", top: "12%" },
      { left: "44%", top: "40%" },
      { left: "12%", top: "86%" },
    ],
    []
  );

  return (
    <main className="relative min-h-screen grid grid-cols-1 md:grid-cols-2 overflow-hidden bg-anim">
      {/* BACKGROUND FX */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="noise" />
      </div>

      {/* BIG ORBITING HALF-CIRCLE */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[-32%] top-1/2 -translate-y-1/2 w-[140vh] h-[140vh] rounded-full circle-glow"
        style={{
          background:
            "radial-gradient(120% 120% at 30% 30%, color-mix(in oklab, white 15%, var(--brand)) 0%, transparent 65%), radial-gradient(100% 100% at 70% 70%, color-mix(in oklab, white 12%, var(--brand-alt)) 0%, transparent 65%), linear-gradient(135deg, var(--brand), var(--brand-alt)))",
        }}
        initial={{ scale: 0.95, opacity: 0.85, rotate: 0, x: -20, y: -20 }}
        animate={{
          scale: [0.95, 1.07, 0.96, 1.05],
          rotate: [0, 360], // continuous rotation
          x: [-20, -10, -25, -15],
          y: [-20, -10, -25, -15],
          opacity: [0.8, 1, 0.85, 0.95],
        }}
        transition={{
          duration: 60, // slow drift + rotation
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Rashid on the right side of the circle */}
      <div
        className="pointer-events-none absolute left-[-18%] top-1/2 -translate-y-1/2 w-[140vh] h-[140vh] flex items-center justify-end pr-[10%] z-20"
        aria-hidden
      >
        <AssistantOrb
          listeningSrc="/video/rashid-listening-unscreen.gif"
          silentSrc="/video/rashid-silent-unscreen.gif"
          size={760}
          listeningFit={{ scale: 1.1, x: 8, y: 5 }}
          silentFit={{ scale: 1, x: 8, y: 5 }}
          crossfadeMs={40}
        />
      </div>

      {/* Stronger twinkles */}
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="twinkle-dot"
          style={{ left: d.left, top: d.top }}
          initial={{ opacity: 0.1, scale: 0.8 }}
          animate={{ opacity: [0.1, 0.9, 0.2], scale: [0.8, 1.3, 0.9] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Sign-in form */}
      <div className="relative z-10 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Signin />
        </div>
      </div>

      <div className="relative z-0 hidden md:block" />
    </main>
  );
}
