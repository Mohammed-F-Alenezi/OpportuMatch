import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/ui/NavBar";
import { ThemeProvider } from "@/components/theme-provider";

// Prevent light "flash" before hydration by forcing dark on <html>
// and also setting it ASAP via an inline script.
function NoFlashScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    // If user has a stored choice, use it; otherwise default to dark (your app default)
    var shouldDark = stored ? (stored === 'dark') : true;
    if (shouldDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // On any error, default to dark
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
})();
        `.trim(),
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
    <html
      lang="ar"
      dir="rtl"
      className="dark"               // hard‑set to avoid white first paint; next-themes can still switch
      suppressHydrationWarning
    >
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
        className="min-h-screen bg-background text-foreground"
        style={{
          // Safe fallbacks in case CSS variables fail to load
          backgroundColor: "var(--background, #0b0f10)",
          color: "var(--foreground, #e8f0ee)",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <NavBar />
          {children}

          {/* Global footer */}
          <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-xs"
                  style={{ color: "var(--subtext)" }}>
            © {new Date().getFullYear()} مزايا — واجهة (MVP)
          </footer>

          {/* Portal root for overlays/modals if you ever need React portals */}
          <div id="modal-root" />
        </ThemeProvider>
      </body>
    </html>
  );
}
