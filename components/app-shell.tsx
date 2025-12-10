"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ui/theme-toggle"
import { cn } from "@/lib/utils"
import { LogOut, Timer, User, Gauge } from "lucide-react"
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf"

const NavLink = ({ href, icon: Icon, children }: { href: string; icon?: any; children: React.ReactNode }) => {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors", active ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground")}> {Icon && <Icon className="h-4 w-4" />} <span className="hidden sm:inline">{children}</span> </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthRoute = pathname?.startsWith('/login') || pathname?.startsWith('/register')
  // Call hook at component top-level (rules of hooks)
  const { fetchWithCsrf } = useFetchWithCsrf()

  const logout = async () => {
    try {
      await fetchWithCsrf("/api/auth/logout", { method: "POST" })
      // Cookie is HttpOnly; server cleared it. Just navigate.
      router.push("/login")
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  const NavItems = () => (
    <div className="flex items-center gap-1">
      <NavLink href="/" icon={Timer}>Time</NavLink>
      <NavLink href="/history">History</NavLink>
      <NavLink href="/export">Export</NavLink>
      <NavLink href="/profile" icon={User}>Profile</NavLink>
    </div>
  )

  return (
    <div className="min-h-dvh bg-aurora">
      {!isAuthRoute && (
        <header className="sticky top-2 md:top-4 z-50 pointer-events-auto">
          <div className="container mx-auto max-w-6xl px-2 md:px-4">
            <div className="mx-auto -mt-2 mb-4 md:mb-6 glass-card p-2 md:p-3 flex items-center justify-between gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Gauge className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <Link href="/" className="font-semibold tracking-tight text-base md:text-lg">Salary Counter</Link>
              </div>
              <nav className="hidden md:flex items-center gap-2">
                <NavItems />
              </nav>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="glass" size="sm" onClick={logout} className="hidden sm:flex rounded-md px-3 py-1.5">
                  <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Logout</span>
                </Button>
                <Button variant="glass" size="icon" onClick={logout} className="sm:hidden" aria-label="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="container mx-auto max-w-6xl p-3 md:p-6">
        {children}
      </main>
    </div>
  )
}
