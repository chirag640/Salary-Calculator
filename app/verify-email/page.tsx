"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const emailQuery = searchParams.get("email") || ""
  const returnTo = searchParams.get("returnTo") || "/"

  const [email, setEmail] = useState(emailQuery)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    let t: number | undefined
    if (resendCooldown > 0) {
      t = window.setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    }
    return () => { if (t) clearTimeout(t) }
  }, [resendCooldown])

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, returnTo }),
      })
      const data = await res.json()
      if (res.ok) {
        // Successful verification -> server sets cookie and returns returnTo
        router.push(data.returnTo || returnTo || "/")
      } else {
        setError(data.error || "Verification failed")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "registration" }),
      })
      const data = await res.json()
      if (res.ok) {
        setInfo(data.message || "New verification code sent")
        // Set cooldown (60s default)
        setResendCooldown(60)
      } else {
        setError(data.error || "Could not resend code")
        if (data.retryAfter) setResendCooldown(Number(data.retryAfter))
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Verify your email</CardTitle>
          <CardDescription className="text-muted-foreground">Enter the 6-digit code we sent to your email.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {info && (
            <Alert variant="default" className="mb-4">
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="Enter 6-digit code" />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Verifying...' : 'Verify'}</Button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <Button variant="secondary" onClick={handleResend} disabled={loading || resendCooldown > 0}>
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
            </Button>

            <Button variant="ghost" onClick={() => router.push('/login')}>Use another method</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
