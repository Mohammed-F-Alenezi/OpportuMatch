import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/ui/NavBar";
import { ThemeProvider } from "@/components/theme-provider";

/** Prevent theme flash: prefer user's saved choice, otherwise default to LIGHT. */
function NoFlashScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function () {
  try {
    var stored = localStorage.getItem('theme');               // 'light' | 'dark' | null
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored ? stored : 'light';                    // default LIGHT
    // If you prefer system by default, uncomment:
    // if (!stored) theme = systemDark ? 'dark' : 'light';
    var root = document.documentElement;
    root.classList.remove('light','dark');
    root.classList.add(theme);
  } catch (e) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
})();`.trim(),
      }}
    />
  );
}

export const metadata: Metadata = {
  title: "منصّة مزايا للتمويل",
  description: "MVP UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <NoFlashScript />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/d3plus@2/build/d3plus.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/d3plus-geomap@2/build/d3plus-geomap.css"
        />
      </head>

      <body
        className="min-h-screen"
        style={{
          background: "var(--background)",
          color: "var(--foreground)",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
          <NavBar />
          {children}

          <footer
            className="mx-auto max-w-7xl px-4 py-10 text-center text-xs"
            style={{ color: "var(--subtext-light)" }}
          >
            © {new Date().getFullYear()} مزايا — واجهة (MVP)
          </footer>

          <div id="modal-root" />
        </ThemeProvider>
      </body>
    </html>
  );
}
