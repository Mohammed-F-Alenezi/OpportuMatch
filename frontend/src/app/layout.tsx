import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/ui/NavBar";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "منصّة مزايا للتمويل",
  description: "MVP UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <NavBar />
          {children}
          <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} مزايا — واجهة (MVP)
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
