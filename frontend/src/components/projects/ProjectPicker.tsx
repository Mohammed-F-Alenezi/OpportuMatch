"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Rocket,
  ShoppingBag,
  Truck,
  GraduationCap,
  Layers,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import BizInfo from "@/components/biz-info";

// icon map
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rocket: Rocket,
  shoppingbag: ShoppingBag,
  truck: Truck,
  graduationcap: GraduationCap,
  layers: Layers,
  building2: Building2,
};

function RenderIcon({ name }: { name?: string | null }) {
  const key = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const Icon = ICONS[key] || Rocket;
  return <Icon className="w-10 h-10" />;
}

type Project = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
};

export default function ProjectPicker({
  projects,
  onCreate,
  onRename,
  onSelect,
  title = "اختر مشروعك",
}: {
  projects?: Project[];
  onCreate?: (name: string) => Promise<{ id: string; name: string } | void>;
  onRename?: (id: string, name: string) => Promise<void>;
  onSelect?: (id: string) => void;
  title?: string;
}) {
  const router = useRouter();

  const data = useMemo<Project[]>(
    () =>
      projects?.length
        ? projects
        : [
            { id: "1", name: "متجري الإلكتروني", icon: "shoppingbag" },
            { id: "2", name: "حل لوجستي للأدوية", icon: "truck" },
            { id: "3", name: "شركة ناشئة جامعية", icon: "graduationcap" },
          ],
    [projects]
  );

  const [addOpen, setAddOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // lock body scroll when the left panel is open (prevents page “shake”)
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

  function startRename(p: Project) {
    setRenamingId(p.id);
    setRenameValue(p.name);
  }
  async function commitRename() {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (!name) return setRenamingId(null);
    await onRename?.(renamingId, name);
    setRenamingId(null);
  }

  // silky cubic-bezier tween
  const EASE: number[] = [0.22, 1, 0.36, 1];

  const tileBg =
    `radial-gradient(
      circle at 50% 50%,
      transparent 70%,
      color-mix(in oklab, var(--brand-alt) 10%, transparent) 88%,
      color-mix(in oklab, var(--brand-alt) 16%, transparent) 100%
    ), var(--background)`;

  const tileBase: React.CSSProperties = {
    background: tileBg,
    border: "1px solid color-mix(in oklab, var(--border) 65%, transparent)",
    boxShadow: "inset 0 6px 14px rgba(0,0,0,0.03), inset 0 -1px 2px rgba(0,0,0,0.02)",
    color: "var(--foreground)",
    willChange: "transform, box-shadow",
  };

  return (
    <div
      dir="rtl"
      className="min-h-[100svh] grid place-items-center overflow-x-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="w-full max-w-5xl px-6 py-10">
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--subtext-light)" }}>
            اختر أحد مشاريعك للمتابعة أو أضف مشروعًا جديدًا
          </p>
        </header>

        {/* GRID SPLIT with animated CSS variables (ultra stable) */}
        <motion.div
          dir="ltr"
          className="grid w-full items-start gap-6"
          style={
            {
              gridTemplateColumns: "var(--left) var(--right)",
              // initial values
              ["--left" as any]: "0fr",
              ["--right" as any]: "1fr",
            } as React.CSSProperties
          }
          animate={
            {
              ["--left" as any]: addOpen ? "0.58fr" : "0fr",
              ["--right" as any]: addOpen ? "0.42fr" : "1fr",
            } as any
          }
          transition={{ type: "tween", ease: EASE, duration: 0.55 }}
        >
          {/* LEFT column (panel container) */}
          <div className="overflow-hidden" style={{ minWidth: 0 }}>
            <AnimatePresence initial={false} mode="wait">
              {addOpen && (
                <motion.div
                  key="panel"
                  initial={{ x: -24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -24, opacity: 0 }}
                  transition={{ type: "tween", ease: EASE, duration: 0.45 }}
                  className="rounded-3xl h-full p-0"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    boxShadow: "0 14px 36px rgba(0,0,0,0.18)",
                  }}
                >
                  <div className="p-4 sm:p-6 md:p-8">
                    <div className="flex items-center justify-between mb-3" dir="rtl">
                      <h2 className="text-lg sm:text-xl font-semibold">إضافة مشروع جديد</h2>
                      <button
                        onClick={() => setAddOpen(false)}
                        className="rounded-md p-2 hover:opacity-80"
                        aria-label="إغلاق"
                        title="إغلاق"
                        style={{ color: "var(--subtext-light)" }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div dir="rtl" className="max-h-[70vh] overflow-auto pr-1">
                      <BizInfo className="py-0" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT column (tiles) */}
          <motion.div
            initial={false}
            animate={{ scale: addOpen ? 0.985 : 1, x: addOpen ? 4 : 0 }}
            transition={{ type: "tween", ease: EASE, duration: 0.45 }}
            style={{ minWidth: 0 }}
          >
            <ul
              dir="ltr"
              className={cn(
                "grid",
                addOpen ? "grid-cols-2 gap-5" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8"
              )}
              style={addOpen ? { gridAutoRows: "1fr" } : undefined}
            >
              {/* + tile first so it’s on the LEFT when closed */}
              {!addOpen && (
                <li className="group flex flex-col items-center">
                  <motion.button
                    onClick={() => setAddOpen(true)}
                    className="rounded-3xl size-40 sm:size-44 md:size-48 grid place-content-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    style={{
                      background: "var(--background)",
                      border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
                      boxShadow: "inset 0 8px 18px rgba(0,0,0,0.04)",
                      willChange: "transform, box-shadow",
                    }}
                    whileHover={{
                      scale: 1.06,
                      y: -2,
                      boxShadow:
                        "0 14px 30px rgba(27,131,84,0.20), inset 0 8px 18px rgba(0,0,0,0.03)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "tween", ease: EASE, duration: 0.28 }}
                    aria-label="إضافة مشروع"
                    title="إضافة مشروع"
                  >
                    <Plus className="size-12" style={{ color: "var(--brand)" }} />
                  </motion.button>
                  <span
                    className="mt-3 text-sm sm:text-base font-medium text-center transition-transform duration-200 ease-out group-hover:scale-110"
                    style={{ color: "var(--foreground)" }}
                  >
                    إضافة مشروع
                  </span>
                </li>
              )}

              {data.map((p) => (
                <li key={p.id} className="group flex flex-col items-center">
                  <motion.button
                    onClick={() =>
                      onSelect ? onSelect(p.id) : router.push(`/projects/${p.id}`)
                    }
                    className={cn(
                      addOpen
                        ? "rounded-3xl size-36 sm:size-40 grid place-content-center"
                        : "rounded-3xl size-40 sm:size-44 md:size-48 grid place-content-center",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    )}
                    style={{ ...tileBase }}
                    whileHover={{
                      scale: addOpen ? 0.97 : 1.06,
                      y: -2,
                      boxShadow:
                        "0 12px 28px rgba(27,131,84,0.14), inset 0 6px 14px rgba(0,0,0,0.03)",
                    }}
                    whileTap={{ scale: addOpen ? 0.93 : 0.98 }}
                    transition={{ type: "tween", ease: EASE, duration: 0.28 }}
                    aria-label={p.name}
                    title={p.name}
                  >
                    <RenderIcon name={p.icon} />
                  </motion.button>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    {renamingId === p.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void commitRename();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-9 w-44 text-center"
                          style={{
                            background: "var(--card)",
                            color: "var(--foreground)",
                            borderColor: "var(--border)",
                          }}
                        />
                        <Button
                          size="sm"
                          type="submit"
                          className="h-9"
                          style={{ background: "var(--brand)", color: "#fff" }}
                        >
                          حفظ
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          className="h-9"
                          onClick={() => setRenamingId(null)}
                          style={{ color: "var(--subtext-light)" }}
                        >
                          إلغاء
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span
                          className="text-sm sm:text-base font-medium text-center transition-transform duration-200 ease-out group-hover:scale-110"
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        {onRename && (
                          <button
                            onClick={() => startRename(p)}
                            className="opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                            aria-label="إعادة تسمية"
                            title="إعادة تسمية"
                            style={{ color: "var(--subtext-light)" }}
                          >
                            <Pencil className="size-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

       
      </div>
    </div>
  );
}
