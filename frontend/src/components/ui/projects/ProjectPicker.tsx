"use client";

import React, { useMemo, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ------- icon map (no emojis) -------
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
  icon?: string | null;   // "rocket" | "shoppingbag" | "truck" | "graduationcap" ...
  color?: string | null;  // optional solid color per project
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

  // fallback mock until you wire Supabase
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

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      setCreating(true);
      const created = await onCreate?.(name);
      setOpenCreate(false);
      setNewName("");
      if (created?.id) {
        onSelect ? onSelect(created.id) : router.push(`/projects/${created.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

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

  return (
    <div
      dir="rtl"
      className="min-h-[100svh] grid place-items-center"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="w-full max-w-5xl px-6 py-10">
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--subtext)" }}>
            اختر أحد مشاريعك للمتابعة أو أضف مشروعًا جديدًا
          </p>
        </header>

        {/* tiles */}
        <ul className="mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {data.map((p) => (
            <li key={p.id}>
              <div className={cn("group relative cursor-pointer")}>
                <button
                  onClick={() =>
                    onSelect ? onSelect(p.id) : router.push(`/projects/${p.id}`)
                  }
                  className="rounded-3xl size-32 sm:size-36 grid place-content-center transition-all duration-200 w-full"
                  style={{
                    // fill from project color or from brandAlt tint
                    background:
                      p.color ??
                      "color-mix(in oklab, var(--brandAlt) 25%, transparent)",
                    // subtle ring using your --border token
                    border: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
                    boxShadow: "inset 0 1px 8px rgba(0,0,0,.25)",
                  }}
                >
                  <RenderIcon name={p.icon} />
                </button>

                {/* name + rename */}
                <div
                  className="mt-3 w-full flex items-center justify-center gap-2"
                  style={{ color: "var(--text)" }}
                >
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
                        className="h-8 w-40 text-center"
                        style={{
                          background: "var(--surface)",
                          color: "var(--text)",
                          borderColor: "var(--border)",
                        }}
                      />
                      <Button
                        size="sm"
                        type="submit"
                        className="h-8"
                        style={{ background: "var(--brand)", color: "white" }}
                      >
                        حفظ
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setRenamingId(null)}
                        style={{ color: "var(--subtext)" }}
                      >
                        إلغاء
                      </Button>
                    </form>
                  ) : (
                    <>
                      <span
                        className="text-sm sm:text-base font-medium text-center truncate max-w-40"
                        title={p.name}
                      >
                        {p.name}
                      </span>
                      {onRename && (
                        <button
                          onClick={() => startRename(p)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="إعادة تسمية"
                          title="إعادة تسمية"
                          style={{ color: "var(--subtext)" }}
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}

          {/* add project tile */}
          <li>
            <div
              className="rounded-3xl h-full flex flex-col items-center justify-center py-3 transition-colors"
              style={{
                border: "1px dashed color-mix(in oklab, var(--border) 70%, transparent)",
                background: "var(--surface)",
              }}
            >
              <button
                onClick={() => setOpenCreate(true)}
                className="rounded-3xl size-32 sm:size-36 grid place-content-center transition-all"
                aria-label="إضافة مشروع"
                style={{
                  background:
                    "color-mix(in oklab, var(--surface2) 60%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
                }}
              >
                <Plus className="size-10" />
              </button>
              <span className="mt-3 text-sm sm:text-base font-medium">إضافة مشروع</span>
            </div>
          </li>
        </ul>

        {/* legend (optional) */}
        <div
          className="mt-12 flex items-center justify-center gap-4 text-xs"
          style={{ color: "var(--subtext)" }}
        >
          <div className="flex items-center gap-2">
            <Layers className="size-4" />
            <span>مشاريعك</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="size-4" />
            <span>شركاتك الناشئة</span>
          </div>
        </div>
      </div>

      {/* lightweight modal (no shadcn) */}
      {openCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div
            className="absolute inset-0"
            onClick={() => setOpenCreate(false)}
            style={{ background: "rgba(0,0,0,.6)" }}
          />
          <div
            className="relative rounded-xl w-full max-w-md p-6 shadow-2xl"
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            <h2 className="text-lg font-semibold mb-1">مشروع جديد</h2>
            <p className="text-sm mb-4" style={{ color: "var(--subtext)" }}>
              سمِّ مشروعك لبدء الإعداد
            </p>
            <form onSubmit={handleCreate} className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="projectName" className="text-sm">
                  اسم المشروع
                </label>
                <Input
                  id="projectName"
                  placeholder="مثال: متجري الإلكتروني"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    background: "var(--surface2)",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                  }}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpenCreate(false)}
                  style={{ color: "var(--subtext)" }}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={creating} style={{ background: "var(--brand)", color: "#fff" }}>
                  {creating ? "جارٍ الإنشاء…" : "إنشاء"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
