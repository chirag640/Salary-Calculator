"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

export function useSystemTheme() {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return "light"

  return theme === "system" ? systemTheme : theme
}

export function usePrefersDark() {
  const [prefersDark, setPrefersDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setPrefersDark(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersDark
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersReducedMotion
}

export function useHighContrast() {
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: high)")
    setHighContrast(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return highContrast
}
