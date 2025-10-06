"use client";
import { useState, useCallback, useEffect } from "react";

/**
 * useCsrfToken hook centralizes double-submit CSRF token acquisition.
 * - Reads existing token from cookie if present.
 * - Falls back to calling /api/csrf to obtain + set cookie.
 * - Exposes ensureCsrfToken() to guarantee a token before mutating requests.
 */
export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const readCookie = useCallback((name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.split(/; */).find((c) => c.startsWith(name + "="));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  }, []);

  const ensureCsrfToken = useCallback(async (): Promise<string | null> => {
    const existing = readCookie("csrf-token");
    if (existing) {
      if (existing !== csrfToken) setCsrfToken(existing);
      return existing;
    }
    try {
      const res = await fetch("/api/csrf", { method: "GET", cache: "no-store", credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        if (data?.csrfToken) {
          setCsrfToken(data.csrfToken);
          return data.csrfToken as string;
        }
      }
    } catch {
      /* swallow */
    }
    return null;
  }, [csrfToken, readCookie]);

  // Preload once on mount
  useEffect(() => { ensureCsrfToken(); }, [ensureCsrfToken]);

  const refresh = useCallback(async () => {
    // Force refresh ignoring cookie by calling endpoint directly
    try {
      const res = await fetch("/api/csrf", { method: "GET", cache: "no-store", credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        if (data?.csrfToken) {
          setCsrfToken(data.csrfToken);
          return data.csrfToken as string;
        }
      }
    } catch {}
    return null;
  }, []);

  return { csrfToken, ensureCsrfToken, refreshCsrfToken: refresh };
}
