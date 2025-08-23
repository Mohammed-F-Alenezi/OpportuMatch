"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"        // applies .dark or .light on <html>
      defaultTheme="dark"      // default is dark mode
      enableSystem={true}      // respect OS settings if user hasn’t chosen
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
