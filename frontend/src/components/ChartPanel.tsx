// src/components/ChartPanel.tsx
import { ReactNode } from "react";

export default function ChartPanel({
  title,
  icon,
  children,
  height = 320,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  height?: number;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-[1.05rem] font-semibold">
        {icon} {title}
      </h3>
      <div
        className="rounded-2xl p-3 ring-1"
        style={{
          height,
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {children}
      </div>
    </section>
  );
}
