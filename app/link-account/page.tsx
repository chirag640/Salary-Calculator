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
import { AlertCircle, Link2, Mail } from "lucide-react";

function LinkAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const returnTo = searchParams.get("returnTo") || "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Parse token on mount
  useEffect(() => {
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, "base64").toString());
        setLinkData(decoded);
        setEmail(decoded.email || "");
      } catch (e) {
        setError("Invalid link token. Please try signing in again.");
      }
    }

    if (errorParam === "different_user") {
      setError(
        "You're currently signed in as a different user. Please sign out first, then sign in with the account you want to link."
      );
    }
  }, [token, errorParam]);

  const handlePasswordLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Successfully linked - redirect to returnTo
        router.push(returnTo);
      } else {
        setError(data.error || "Failed to link account");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "link-account" }),
      });

      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
      } else {
        setError(data.error || "Failed to send verification code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-link-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, token }),
      });

      const data = await res.json();

      if (res.ok) {
        // Successfully linked - redirect to returnTo
        router.push(returnTo);
      } else {
        setError(data.error || "Failed to verify code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  if (!linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error ||
                  "Invalid or expired link token. Please try signing in again."}
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/login")}
                className="flex-1"
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex-1"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-aurora px-4 py-12">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Link2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Link Your Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            An account with <strong>{linkData.email}</strong> already exists.
            Verify your identity to link your Google account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!otpSent ? (
            <div className="space-y-4">
              <form onSubmit={handlePasswordLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
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
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="glass"
                  disabled={loading}
                >
                  {loading ? "Linking..." : "Link with Password"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendOTP}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Sending..." : "Link with Email Code"}
              </Button>

              <div className="mt-4 text-center space-y-2">
                <Button
                  variant="ghost"
                  className="text-sm"
                  onClick={handleSignOut}
                >
                  Sign out and use a different account
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleOTPLink} className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  We've sent a 6-digit verification code to{" "}
                  <strong>{email}</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
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
                {loading ? "Verifying..." : "Verify & Link Account"}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  className="text-sm"
                  onClick={() => setOtpSent(false)}
                >
                  Use password instead
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LinkAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <LinkAccountContent />
    </Suspense>
  );
}
