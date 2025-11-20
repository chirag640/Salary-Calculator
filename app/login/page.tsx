"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import GoogleSignInButton from "../../components/google-signin-button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  const [showPasswordlessLogin, setShowPasswordlessLogin] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Cookie is now HttpOnly and set by server; just navigate.
        router.replace(returnTo);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok || response.status === 200) {
        setOtpSent(true);
        setSuccess(data.message || "Login code sent to your email");
      } else {
        setError(data.error || "Failed to send login code");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/verify-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, otp, returnTo }),
      });

      const data = await response.json();

      if (response.ok) {
        // Cookie is now HttpOnly and set by server; just navigate.
        router.replace(data.returnTo || returnTo);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Detect account_conflict from query params and extract returnTo
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      const conflict = params.get("conflictEmail");
      const returnToParam = params.get("returnTo");

      if (returnToParam) setReturnTo(returnToParam);

      if (err === "account_conflict") {
        setError(
          "You are signed in as a different user. Please sign out and sign in with the correct account to link."
        );
        if (conflict) setConflictEmail(conflict);
      }
    } catch {}
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      // Reload to clear client-side state and show fresh login
      window.location.href = "/login";
    } catch {
      // best-effort
      window.location.href = "/login";
    }
  };

  // If already logged in (cookie from server or token in localStorage), redirect away from login
  // This is a light client-side guard; the middleware is the main gate.
  // With HttpOnly cookie we can't reliably read it client-side; optional: could call a /api/me endpoint.
  // For simplicity we skip auto-redirect here; middleware protects authenticated pages.

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-aurora px-4 py-12">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your time tracker account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {error}
                {conflictEmail && (
                  <div className="mt-2 text-sm">
                    The Google account attempting to link is:{" "}
                    <strong>{conflictEmail}</strong>
                  </div>
                )}
                <div className="mt-3">
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign out current session
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {!showPasswordlessLogin ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                  />
                  <div className="flex justify-end pt-1">
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="glass"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <GoogleSignInButton redirectTo="/" />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPasswordlessLogin(true)}
                  type="button"
                >
                  Sign in with Email Code
                </Button>
              </div>
            </>
          ) : (
            <>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-otp">Email</Label>
                    <Input
                      id="email-otp"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    variant="glass"
                    disabled={loading}
                  >
                    {loading ? "Sending code..." : "Send Login Code"}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowPasswordlessLogin(false)}
                    type="button"
                  >
                    Back to Password Login
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-display">Email</Label>
                    <Input
                      id="email-display"
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp">Login Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    variant="glass"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleSendOTP}
                      disabled={loading}
                      type="button"
                    >
                      Resend Code
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        setOtpSent(false);
                        setShowPasswordlessLogin(false);
                        setOtp("");
                      }}
                      type="button"
                    >
                      Back
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
