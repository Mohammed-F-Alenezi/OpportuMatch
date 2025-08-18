import Link from "next/link";
import Button from "@/components/ui/button";

export default function Page() {
  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-3">
      <div className="col-span-1 grid grid-cols-2 gap-4 md:col-span-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl border shadow-sm"
               style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--surface2) 50%, transparent)" }} />
        ))}
      </div>
      <div className="col-span-1 rounded-3xl border p-8" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <p className="mb-2 text-sm" style={{ color: "var(--brand)" }}>حلول تمويلية ذكية</p>
        <h2 className="mb-3 text-3xl font-bold leading-snug">منصّتك الذكيّة للوصول إلى الفرص التمويلية المناسبة</h2>
        <p className="mb-6" style={{ color: "var(--subtext)" }}>اعثر على التمويل المناسب بسهولة وسرعة</p>
        <div className="flex gap-3">
          <Link href="/signup"><Button>ابدأ الآن</Button></Link>
          <Link href="/signin"><Button variant="outline">تسجيل الدخول</Button></Link>
        </div>
      </div>
    </main>
  );
}
