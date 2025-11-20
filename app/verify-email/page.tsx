"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailQuery = searchParams.get("email") || "";
  const returnTo = searchParams.get("returnTo") || "/";

  const [email, setEmail] = useState(emailQuery);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let t: number | undefined;
    if (resendCooldown > 0) {
      t = window.setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [resendCooldown]);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, returnTo }),
      });
      const data = await res.json();
      if (res.ok) {
        // Successful verification -> server sets cookie and returns returnTo
        router.push(data.returnTo || returnTo || "/");
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "registration" }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo(data.message || "New verification code sent");
        // Set cooldown (60s default)
        setResendCooldown(60);
      } else {
        setError(data.error || "Could not resend code");
        if (data.retryAfter) setResendCooldown(Number(data.retryAfter));
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-12">
      <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <span className="text-2xl">✉️</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Enter the 6-digit code we sent to your email.
          </CardDescription>
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

          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-medium">
                Verification Code
              </Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="h-11 text-center text-lg tracking-widest"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
              className="w-full"
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Resend verification code"}
            </Button>

            <div className="text-center pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
                className="text-sm font-medium"
              >
                Use another method
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="text-center">
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
