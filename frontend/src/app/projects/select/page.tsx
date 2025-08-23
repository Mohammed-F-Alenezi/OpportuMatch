"use client";

import ProjectPicker from "@/components/projects/ProjectPicker";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export default function Page() {
  const { theme, setTheme } = useTheme();

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)" }}>

      <ProjectPicker />
    </main>
  );
}