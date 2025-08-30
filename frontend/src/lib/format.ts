export function formatNumberArabic(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";

  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " مليار";
  if (abs >= 1_000_000)     return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + " مليون";
  if (abs >= 1_000)         return (value / 1_000).toFixed(1).replace(/\.0$/, "") + " ألف";

  return value.toString();
}

export function compactEN(n?: number | null) {
  if (n == null || !isFinite(n)) return "—";
  // 0.0, 0.0K, 0.0M, 0.0B
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000)     return (n / 1_000_000).toFixed(1)     + "M";
  if (abs >= 1_000)         return (n / 1_000).toFixed(1)         + "K";
  return Math.round(n).toString();
}

export function fullEN(n?: number | null) {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function pct(v?: number | null, digits = 1) {
  if (v == null || !isFinite(v)) return "—";
  return v.toFixed(digits) + "%";
}
