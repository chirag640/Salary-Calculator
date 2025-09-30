"use client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
  await res.json().catch(()=>null)
  setSent(true)
  toast({ title: "If the email exists, a reset link was sent." })
    } catch {
      toast({ title: "Error", description: "Please try again later", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-sm">
              <p>If an account exists for <strong>{email}</strong>, a reset link was sent. Please check your inbox (and spam folder). The link expires in 15 minutes.</p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => { setEmail(""); setSent(false) }}>Send Again</Button>
                <Button asChild>
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <Button type="submit" disabled={loading || !email} className="w-full">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-right text-xs">
                <Link href="/login" className="text-primary hover:underline">Back to login</Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}