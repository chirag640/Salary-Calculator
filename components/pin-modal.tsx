"use client";

import React, { useEffect, useRef, useState } from "react";

type PinModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function PinModal({ open, onClose, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setError(null);
      setAttemptsLeft(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
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
        if (typeof data?.attemptsLeft === "number")
          setAttemptsLeft(data.attemptsLeft);
        setLoading(false);
        return;
      }

      // success
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError("Network error");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-background/95 dark:bg-background/90 backdrop-blur-xl border border-border/50 p-8 w-[420px] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 id="pin-modal-title" className="text-2xl font-bold mb-2">
            Enter Your PIN
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter your privacy PIN to view sensitive information
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="pin-input"
              className="block text-sm font-medium mb-2 text-foreground"
            >
              PIN Code
            </label>
            <input
              id="pin-input"
              ref={inputRef}
              inputMode="numeric"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              maxLength={6}
              placeholder="Enter 4-6 digit PIN"
              className="w-full px-4 py-3.5 text-lg text-center font-mono tracking-widest border border-input bg-background/50 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              aria-label="Enter your privacy PIN"
            />
          </div>

          {error && (
            <div role="alert" className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                {error}
                {attemptsLeft != null && <div className="font-semibold mt-1">{attemptsLeft} attempts remaining</div>}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-transparent border border-input rounded-xl hover:bg-accent hover:border-accent-foreground/20 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-primary/20 disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Unlock"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
