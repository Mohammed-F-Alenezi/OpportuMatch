"use client";
import * as React from "react";

export default function Input({ label, ...rest }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      {label && <span className="text-sm" style={{ color: "var(--subtext)" }}>{label}</span>}
      <input
        {...rest}
        className="rounded-xl border px-4 py-2 text-sm outline-none"
        style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--surface2) 60%, transparent)", color: "var(--text)" }}
      />
    </label>
  );
}
