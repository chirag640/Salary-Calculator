"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { usePrefersReducedMotion, useHighContrast } from "@/hooks/use-theme-preferences"

/**
 * Automatically adapts the app to system preferences
 * - Detects dark mode preference
 * - Applies high contrast if needed
 * - Respects reduced motion settings
 */
export function SystemThemeAdapter() {
  const { theme, setTheme } = useTheme()
  const prefersReducedMotion = usePrefersReducedMotion()
  const highContrast = useHighContrast()

  // Apply reduced motion to document
  useEffect(() => {
    if (prefersReducedMotion) {
      document.documentElement.classList.add("reduce-motion")
    } else {
      document.documentElement.classList.remove("reduce-motion")
    }
  }, [prefersReducedMotion])

  // Apply high contrast mode
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast")
    } else {
      document.documentElement.classList.remove("high-contrast")
    }
  }, [highContrast])

  // Sync with system theme changes
  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      // Theme will auto-update via next-themes
      console.log("System theme changed to:", e.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [theme])

  return null
}
