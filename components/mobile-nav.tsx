"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  Clock, 
  FileText, 
  User,
  History
} from "lucide-react"

const navItems = [
  {
    href: "/",
    label: "Time",
    icon: Clock,
  },
  {
    href: "/history",
    label: "History",
    icon: History,
  },
  {
    href: "/export",
    label: "Export",
    icon: FileText,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
  },
]

// Pages where mobile nav should be hidden
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
  "/link-account",
  "/welcome",
]

export function MobileNav() {
  const pathname = usePathname()

  // Hide navigation on auth pages
  const shouldHide = AUTH_PAGES.some(authPage => pathname.startsWith(authPage))
  
  if (shouldHide) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-full px-2 transition-colors
                ${isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
