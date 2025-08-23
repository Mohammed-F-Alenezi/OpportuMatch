"use client";

import ProjectPicker from "@/components/projects/ProjectPicker";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export default function Page() {
  const { theme, setTheme } = useTheme();

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* simple top-right theme toggle (optional) */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-xl px-3 py-2 text-sm"
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <ProjectPicker />
    </main>
  );
}
