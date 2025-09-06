"use client";

import ProjectPicker from "@/components/projects/ProjectPicker";

export default function Page() {
  return (
    <main style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <ProjectPicker />
    </main>
  );
}
