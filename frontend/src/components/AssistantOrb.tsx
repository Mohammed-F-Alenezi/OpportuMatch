"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Fit = { scale?: number; x?: number; y?: number };

type Props = {
  listeningSrc: string;              // gif/png/webp or mp4/webm
  silentSrc: string;
  size?: number;                     // px
  idleMs?: number;                   // time to revert to silent when idle
  glow?: boolean;                    // soft glow behind media
  hoverSelector?: string;            // stay “listening” while hovering
  focusSelector?: string;            // stay “listening” while focusing
  crossfadeMs?: number;              // opacity fade duration (ms)
  listeningFit?: Fit;                // per-state alignment
  silentFit?: Fit;                   // per-state alignment
};

const HOVER_SEL_DEFAULT =
  'input,textarea,[contenteditable="true"],.listening-zone';
const FOCUS_SEL_DEFAULT = HOVER_SEL_DEFAULT;

export default function AssistantOrb({
  listeningSrc,
  silentSrc,
  size = 220,
  idleMs = 1200,
  glow = false,
  hoverSelector = HOVER_SEL_DEFAULT,
  focusSelector = FOCUS_SEL_DEFAULT,
  crossfadeMs = 60,                 // small, snappy fade
  listeningFit,
  silentFit,
}: Props) {
  // --- sticky listening (typing / hover / focus) ---
  const [isListening, setIsListening] = useState(false);
  const hoveringRef = useRef(false);
  const focusedRef  = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSilent = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!hoveringRef.current && !focusedRef.current) setIsListening(false);
    }, idleMs);
  };

  useEffect(() => {
    const activate = () => {
      setIsListening(true);
      scheduleSilent();
    };

    const onKey = () => activate();
    const onInput = () => activate();

    const onFocusIn = (e: Event) => {
      if ((e.target as Element)?.closest?.(focusSelector)) {
        focusedRef.current = true;
        setIsListening(true);
      }
    };
    const onFocusOut = (e: Event) => {
      if ((e.target as Element)?.closest?.(focusSelector)) {
        focusedRef.current = false;
        scheduleSilent();
      }
    };
    const onPointerOver = (e: Event) => {
      if ((e.target as Element)?.closest?.(hoverSelector)) {
        hoveringRef.current = true;
        setIsListening(true);
      }
    };
    const onPointerOut = (e: Event) => {
      if ((e.target as Element)?.closest?.(hoverSelector)) {
        hoveringRef.current = false;
        scheduleSilent();
      }
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("input", onInput, true);
    window.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("focusout", onFocusOut, true);
    window.addEventListener("pointerover", onPointerOver, true);
    window.addEventListener("pointerout", onPointerOut, true);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("input", onInput, true);
      window.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("focusout", onFocusOut, true);
      window.removeEventListener("pointerover", onPointerOver, true);
      window.removeEventListener("pointerout", onPointerOut, true);
    };
  }, [hoverSelector, focusSelector, idleMs]);

  // --- frame & classes ---
  const frameStyle = useMemo<React.CSSProperties>(
    () => ({ width: size, height: size }),
    [size]
  );
  const baseLayerClass =
    "absolute inset-0 m-auto pointer-events-none bg-transparent";
  const mediaClass = "w-full h-full object-contain";
  const listeningStyle: React.CSSProperties = {
    opacity: isListening ? 1 : 0,
    transition: `opacity ${crossfadeMs}ms linear`,
    willChange: "opacity, transform",
  };
  const silentStyle: React.CSSProperties = {
    opacity: isListening ? 0 : 1,
    transition: `opacity ${crossfadeMs}ms linear`,
    willChange: "opacity, transform",
  };

  const fitToStyle = (fit?: Fit): React.CSSProperties => {
    const { scale = 1, x = 0, y = 0 } = fit || {};
    return {
      transform: `translate(${x}%, ${y}%) scale(${scale})`,
      transformOrigin: "center center",
    };
  };

  return (
    <div className="relative flex items-center justify-center" style={frameStyle}>
      {glow && (
        <div
          className="absolute inset-0 blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
        />
      )}

      {/* Layer 1: LISTENING (always mounted) */}
      <div className={baseLayerClass} style={{ ...listeningStyle, ...fitToStyle(listeningFit) }}>
        <Media src={listeningSrc} className={mediaClass} />
      </div>

      {/* Layer 2: SILENT (always mounted) */}
      <div className={baseLayerClass} style={{ ...silentStyle, ...fitToStyle(silentFit) }}>
        <Media src={silentSrc} className={mediaClass} />
      </div>
    </div>
  );
}

/* ---------- media (img/gif or video) ---------- */

function Media({ src, className }: { src: string; className?: string }) {
  const isImage = /\.(gif|png|apng|webp|jpg|jpeg|svg)$/i.test(src);
  if (isImage) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        draggable={false}
        loading="eager"
        decoding="sync"
      />
    );
  }
  return (
    <video className={className} muted playsInline loop autoPlay preload="auto">
      <source src={src} />
    </video>
  );
}
