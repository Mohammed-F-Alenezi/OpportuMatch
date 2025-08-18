import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/ui/NavBar";

export const metadata: Metadata = {
  title: "منصّة مزايا للتمويل",
  description: "MVP UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <NavBar />
        {children}
        <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-xs text-[color:var(--subtext)]">
          © {new Date().getFullYear()} مزايا — واجهة (MVP)
        </footer>
      </body>
    </html>
  );
}
