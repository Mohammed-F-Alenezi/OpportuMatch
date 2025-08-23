export const colors = {
  light: {
    background: "#ECF3F6",
    primary: "#1B8354",
    secondary: "#145E3D",
    accent: "#C1E4C1",
  },
  dark: {
    background: "#111927",
    primary: "#1F2A37",
    secondary: "#0D3D27",
    accent: "#1B8354",
    highlight: "#C1E4C1",
  },
};
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}
