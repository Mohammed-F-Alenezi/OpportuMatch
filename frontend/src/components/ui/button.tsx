"use client";
import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost";
};
export default function Button({ className = "", variant = "solid", ...props }: Props) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition focus:outline-none";
  const cls = {
    solid: "text-white",
    outline: "border",
    ghost: "",
  }[variant];
  const style: React.CSSProperties =
    variant === "solid"
      ? { background: "var(--brand)" }
      : variant === "outline"
      ? { borderColor: "var(--border)", color: "var(--brand)" }
      : { color: "var(--text)", background: "color-mix(in oklab, var(--surface2) 40%, transparent)" };
  return <button {...props} className={`${base} ${cls} ${className}`} style={style} />;
}
