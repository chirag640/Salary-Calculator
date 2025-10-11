"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

interface Props {
  redirectTo?: string
}

export default function GoogleSignInButton({ redirectTo = "/" }: Props) {
  const href = `/api/auth/google/auth?returnTo=${encodeURIComponent(redirectTo)}`
  return (
    <Link href={href} className="block">
      <Button variant="outline" className="w-full flex items-center justify-center gap-2">
        <LogIn className="h-4 w-4" />
        Sign in with Google
      </Button>
    </Link>
  )
}
