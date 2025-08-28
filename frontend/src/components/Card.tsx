import { ReactNode } from "react";

export default function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={[
        // زجاجية داكنة أنيقة
        "rounded-2xl border border-[rgba(255,255,255,0.08)]",
        "bg-[rgba(11,61,46,0.85)] backdrop-blur-md",
        "shadow-[0_8px_24px_rgba(0,0,0,.28)]",
        "p-5",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
