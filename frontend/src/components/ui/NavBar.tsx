"use client";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import { useTheme } from "next-themes";
import moon from "@/assets/Moon_and_Stars.png";
import sun from "@/assets/Sun.png";
import Image from "next/image";
import localFont from "next/font/local";

const xbShafigh = localFont({
  src: "../../assets/fonts/XB_ShafighBd.ttf", 
  variable: "--font-shafigh",
  display: "swap",
});
export default function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className="sticky top-0 z-30  backdrop-blur bg-[--card]"
      style={{ borderColor: "var(--border)",}}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between h-[95px]">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-content-center rounded-xl"
               style={{ background: "color-mix(in oklab, var(--brandAlt) 20%, transparent)", color: "var(--brand)" }}>
            
          </div>
          <Link href="/" className={`text-[28px] font-semibold ${xbShafigh.className}`}>بُوصْلَةُ الْمُمَكِّنَاتْ</Link>
        </div>
        <div className="mt-2">
          <Button variant="ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "light" ? (
              <Image src={moon} alt="Moon and stars" width={40} height={40} />
            ) : (
              <Image src={sun} alt="Sun" width={40} height={40} />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
