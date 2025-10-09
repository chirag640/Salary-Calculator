"use client"

import React from 'react'
import { Button } from './ui/button'

export default function GoogleSignInButton({ redirectTo = '/' }: { redirectTo?: string }) {
  const href = `/api/auth/google/auth?returnTo=${encodeURIComponent(redirectTo)}`

  return (
    <div className="flex items-center justify-center">
      <a href={href}>
        <Button variant="outline" className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21.35 11.1h-9.18v2.92h5.28c-.23 1.45-1.12 2.68-2.39 3.5v2.9h3.86c2.26-2.08 3.57-5.12 3.57-8.83 0-.6-.05-1.18-.14-1.69z" fill="#4285F4" />
            <path d="M12.17 21.01c2.97 0 5.46-1.02 7.28-2.78l-3.86-2.9c-1.07.72-2.44 1.15-3.42 1.15-2.63 0-4.85-1.77-5.64-4.15H2.33v2.61C4.11 18.79 7.88 21.01 12.17 21.01z" fill="#34A853" />
            <path d="M6.53 12.43a6.01 6.01 0 0 1 0-3.86V6.96H2.33a9.98 9.98 0 0 0 0 8.08l4.2-2.61z" fill="#FBBC05" />
            <path d="M12.17 6.46c1.62 0 3.08.56 4.22 1.66l3.15-3.15C17.63 2.28 15.15 1.26 12.17 1.26 7.88 1.26 4.11 3.48 2.33 6.96l4.2 2.61c.79-2.38 3.01-4.15 5.64-4.15z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </Button>
      </a>
    </div>
  )
}
