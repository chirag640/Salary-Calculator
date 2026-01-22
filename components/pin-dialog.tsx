"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  /** Minimum PIN length required (default: 4) */
  minLength?: number;
  /** Maximum PIN length allowed (default: 6) */
  maxLength?: number;
}

/**
 * Unified PIN Dialog Component
 *
 * Responsive design:
 * - Mobile: Compact, centered, touch-friendly
 * - Desktop: Same consistent look as other dialogs
 *
 * Usage:
 * ```tsx
 * <PinDialog
 *   open={showPin}
 *   onClose={() => setShowPin(false)}
 *   onSuccess={() => handleSuccess()}
 *   title="Enter PIN"
 *   description="Verify your identity"
 * />
 * ```
 */
export default function PinDialog({
  open,
  onClose,
  onSuccess,
  title = "Enter Your PIN",
  description = "Enter your privacy PIN to view sensitive information",
  minLength = 4,
  maxLength = 6,
}: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Ensure component is mounted (for SSR compatibility)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin("");
      setError(null);
      setAttemptsLeft(null);
      // Focus input after a small delay to ensure DOM is ready
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (pin.length < minLength) {
        setError(`PIN must be at least ${minLength} digits`);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/pin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pin }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.message || "Incorrect PIN");
          if (typeof data?.attemptsLeft === "number") {
            setAttemptsLeft(data.attemptsLeft);
          }
          setPin("");
          setLoading(false);
          // Re-focus input for retry
          inputRef.current?.focus();
          return;
        }

        // Success
        setLoading(false);
        onSuccess();
        onClose();
      } catch {
        setLoading(false);
        setError("Network error. Please try again.");
      }
    },
    [pin, minLength, onSuccess, onClose],
  );

  if (!open || !mounted) return null;

  const dialogContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-dialog-title"
      aria-describedby="pin-dialog-description"
      className={cn(
        "fixed inset-0 z-[9999]",
        "flex items-center justify-center",
        "p-4 sm:p-6",
        "bg-black/70 backdrop-blur-md",
        "animate-in fade-in duration-200",
      )}
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          // Base styles with glass effect
          "bg-card/95 backdrop-blur-xl border border-border/50",
          "rounded-3xl overflow-hidden",
          // Shadows for depth
          "shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          // Compact sizing for minimal look
          "w-full max-w-[320px] sm:max-w-[340px]",
          "mx-auto",
          // Animation
          "animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-1 space-y-1.5">
          <h2
            id="pin-dialog-title"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p
            id="pin-dialog-description"
            className="text-sm text-muted-foreground leading-relaxed"
          >
            {description}
          </p>
        </div>

        {/* Body - Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* PIN Input */}
          <div className="space-y-2 pt-3">
            <label
              htmlFor="pin-input"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Enter PIN
            </label>
            <input
              ref={inputRef}
              id="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={maxLength}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setPin(val);
                setError(null);
              }}
              disabled={loading}
              placeholder="••••"
              autoComplete="off"
              className={cn(
                "w-full h-12 px-4 text-center text-xl tracking-[0.5em]",
                "bg-background/60 border border-border rounded-xl",
                "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40",
                "hover:border-border/80 transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                error &&
                  "border-destructive/50 focus:ring-destructive/40 focus:border-destructive/40",
              )}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-200">
              <svg
                className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-destructive">{error}</p>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <p className="text-xs text-destructive/80">
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""}{" "}
                    remaining
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={cn(
                "flex-1 h-10 px-4 rounded-xl",
                "bg-muted/80 hover:bg-muted text-foreground",
                "text-sm font-medium",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < minLength}
              className={cn(
                "flex-1 h-10 px-4 rounded-xl",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "text-sm font-medium",
                "transition-all duration-200",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                loading && "cursor-wait",
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render dialog at document.body level to ensure it's always centered on full screen
  return createPortal(dialogContent, document.body);
}

// Re-export for backward compatibility with existing imports
export { PinDialog };
