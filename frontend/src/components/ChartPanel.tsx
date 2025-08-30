// src/components/ChartPanel.tsx
"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  height?: number;          // fixed inner chart height (keeps rows equal)
  toolbar?: ReactNode;      // optional controls on the left of the header
  footer?: ReactNode;       // optional small note below the chart area
  className?: string;       // extra classes for the outer <section>
};

export default function ChartPanel({
  title,
  icon,
  children,
  height = 320,
  toolbar,
  footer,
  className,
}: Props) {
  return (
    <section dir="rtl" className={cn("h-full", className)}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[1.05rem] font-semibold">
          {icon} {title}
        </h3>
        {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
      </div>

      {/* Card */}
      <div
        className="flex h-full flex-col rounded-2xl border bg-[--surface] shadow-sm"
        style={{ borderColor: "var(--border)" }}
        role="region"
        aria-label={title}
      >
        {/* Chart area (fixed height to avoid empty space + unify rows) */}
        <div
          className="relative overflow-hidden rounded-xl p-3"
          style={{ height }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="border-t px-4 py-3 text-xs text-muted-foreground"
               style={{ borderColor: "var(--border)" }}>
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
