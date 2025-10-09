"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ui/theme-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { LogOut, Menu, Timer, User, Gauge, FileText, Download } from "lucide-react"
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
  const [open, setOpen] = useState(false)
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
      <NavLink href="/profile" icon={User}>Profile</NavLink>
      {/* For features on main page tabs, keep simple links to home */}
      <a href="/#invoice" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent">
        <FileText className="h-4 w-4" /><span className="hidden sm:inline">Invoice</span>
      </a>
      <a href="/#export" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent">
        <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
      </a>
    </div>
  )

  return (
    <div className="min-h-dvh bg-aurora">
      {!isAuthRoute && (
        <header className="sticky top-4 z-50 pointer-events-auto">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mx-auto -mt-2 mb-6 glass-card p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Gauge className="h-6 w-6 text-primary" />
                <Link href="/" className="font-semibold tracking-tight text-lg">Salary Counter</Link>
              </div>
              <nav className="hidden md:flex items-center gap-2">
                <NavItems />
              </nav>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="glass" size="sm" onClick={logout} className="rounded-md px-3 py-1.5">
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button variant="glass" size="icon" className="md:hidden" aria-label="Open menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="flex flex-col gap-2">
                    <div className="mt-8 flex flex-col gap-1">
                      <NavItems />
                    </div>
                    <div className="mt-auto">
                      <Button variant="glass" className="w-full" onClick={() => { setOpen(false); logout() }}>
                        <LogOut className="h-4 w-4 mr-2" /> Logout
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="container mx-auto max-w-6xl p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
