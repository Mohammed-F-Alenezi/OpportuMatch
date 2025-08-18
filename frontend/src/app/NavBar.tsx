"use client";
import Link from "next/link";
import Button from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export default function NavBar() {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--surface) 85%, transparent)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-content-center rounded-xl"
               style={{ background: "color-mix(in oklab, var(--brandAlt) 20%, transparent)", color: "var(--brand)" }}>
            ⚙️
          </div>
          <Link href="/" className="text-lg font-semibold">منصّة مزايا للتمويل</Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "وضع النهار" : "الوضع الداكن"}
          </Button>
          <Link href="/signin"><Button variant="outline">تسجيل الدخول</Button></Link>
          <Link href="/signup"><Button>إنشاء حساب</Button></Link>
        </div>
      </div>
    </header>
  );
}
