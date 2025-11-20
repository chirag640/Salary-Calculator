"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json().catch(() => null);
      setSent(true);
      toast({ title: "If the email exists, a reset link was sent." });
    } catch {
      toast({
        title: "Error",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-12">
      <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <span className="text-2xl">🔑</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Forgot Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-5">
              <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
                <AlertDescription className="text-sm leading-relaxed">
                  If an account exists for{" "}
                  <strong className="font-semibold">{email}</strong>, a reset
                  link was sent. Please check your inbox (and spam folder). The
                  link expires in 15 minutes.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEmail("");
                    setSent(false);
                  }}
                  className="flex-1"
                >
                  Send Again
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-11 font-semibold"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-center pt-4 border-t border-border">
                <Link
                  href="/login"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
