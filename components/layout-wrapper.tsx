"use client"

import { usePathname } from "next/navigation"

// Pages where mobile nav should be hidden (no bottom padding needed)
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
  "/link-account",
  "/welcome",
]

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Don't add bottom padding on auth pages since there's no mobile nav
  const isAuthPage = AUTH_PAGES.some(authPage => pathname.startsWith(authPage))
  
  return (
    <div className={isAuthPage ? "" : "pb-20 md:pb-0"}>
      {children}
    </div>
  )
}
