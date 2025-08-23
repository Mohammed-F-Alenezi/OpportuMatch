"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Page() {
  const EASE: number[] = [0.22, 1, 0.36, 1];

  return (
    <main
      className="mx-auto max-w-7xl px-4 py-8 md:px-6"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Keep your existing layout: tiles left, hero right */}
      <div dir="ltr" className="grid gap-6 md:grid-cols-3 items-start">
        {/* LEFT — small tiles (2×3) */}
        <section className="md:col-span-1">
          <div
            className="grid gap-5 justify-start"
            style={{ gridTemplateColumns: "repeat(2,160px)", gridAutoRows: "160px" }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "tween", ease: EASE, duration: 0.45, delay: 0.12 + i * 0.05 }}
                whileHover={{
                  y: -3,
                  boxShadow: "0 10px 20px rgba(0,0,0,.18)",
                  transition: { type: "tween", ease: EASE, duration: 0.12 },
                }}
                whileTap={{ scale: 0.98, transition: { duration: 0.08 } }}
                className="rounded-2xl"
                style={{
                  width: 160,
                  height: 160,
                  /* tile fill that adapts to theme */
                  background: "color-mix(in oklab, var(--card) 70%, var(--background))",
                  border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
                }}
              />
            ))}
          </div>
        </section>

        {/* RIGHT — hero (narrower, taller) with CONSTANT depth shading (works in light/dark) */}
        <section className="md:col-span-2">
          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "tween", ease: EASE, duration: 0.6 }}
            className="
              relative rounded-3xl p-8 md:p-10
              min-h-[300px] md:min-h-[340px] lg:min-h-[380px]
              flex flex-col justify-center
              ml-auto max-w-[680px] lg:max-w-[720px] overflow-hidden
            "
            style={{
              /* HERO uses theme card color:
                 - dark: #1F2A37 (from your .dark --card)
                 - light: #FFFFFF (from :root --card) */
              background: "var(--card)",
              border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
              boxShadow: "0 18px 48px rgba(0,0,0,.12)", // softer in light, still fine in dark
            }}
          >
            {/* constant depth overlays, tuned for both themes */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  // subtle brand vignette + soft top highlight
                  "radial-gradient(1100px 460px at 85% -10%, color-mix(in oklab, var(--brand) 7%, transparent), transparent 55%), radial-gradient(760px 360px at -20% 120%, rgba(255,255,255,.06), transparent 50%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}
            />

            <p className="mb-2 text-sm text-right relative z-10" style={{ color: "var(--brand)" }}>
              حلول تمويلية ذكيّة
            </p>

            <h2 className="mb-3 text-right font-bold leading-snug text-4xl md:text-5xl relative z-10">
              منصّتك الذكيّة للوصول إلى
              <br />
              الفرص التمويلية المناسبة
            </h2>

            <p className="text-right relative z-10"
               /* theme-aware subtext */
               style={{ color: "color-mix(in oklab, var(--foreground) 70%, transparent)" }}>
              اعثر على التمويل المناسب بسهولة وسرعة
            </p>
          </motion.div>

          {/* CTAs BELOW — aligned with the text inset (no text hover; just background changes) */}
          <div
            dir="rtl"
            className="mt-5 flex justify-start gap-3 ml-auto max-w-[680px] lg:max-w-[720px] pr-8 md:pr-10"
          >
            {/* Sign up — green base, subtle lighten on hover (works light/dark) */}
            <Link href="/signup">
              <motion.button
                className="h-12 px-7 text-base rounded-xl border"
                style={{
                  backgroundColor: "var(--brand)",
                  color: "#fff",
                  borderColor: "transparent",
                }}
                whileHover={{
                  backgroundColor: "color-mix(in oklab, var(--brand) 88%, white)",
                  boxShadow: "0 8px 20px rgba(27,131,84,.16)",
                  transition: { type: "tween", ease: EASE, duration: 0.14 },
                }}
                whileTap={{ scale: 0.98, transition: { duration: 0.08 } }}
              >
                ابدأ الآن
              </motion.button>
            </Link>

            {/* Sign in — outline that tints green on hover (theme-aware fill) */}
            <Link href="/signin">
              <motion.button
                className="h-12 px-7 text-base rounded-xl border"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--foreground)",
                  borderColor: "var(--border)",
                }}
                whileHover={{
                  backgroundColor: "color-mix(in oklab, var(--brand) 10%, var(--card))",
                  borderColor: "color-mix(in oklab, var(--brand) 55%, var(--border))",
                  boxShadow: "0 8px 20px rgba(27,131,84,.10)",
                  transition: { type: "tween", ease: EASE, duration: 0.14 },
                }}
                whileTap={{ scale: 0.98, transition: { duration: 0.08 } }}
              >
                تسجيل الدخول
              </motion.button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
