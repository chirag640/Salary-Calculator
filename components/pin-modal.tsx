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
      className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-[9999]"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-background border border-border p-5 w-[360px] rounded-lg shadow-2xl"
      >
        <h2 id="pin-modal-title" className="text-lg font-semibold mb-2">
          Enter your privacy PIN
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          This keeps sensitive values hidden until you confirm.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="pin-input"
            className="block text-sm font-medium mb-1.5"
          >
            PIN
          </label>
          <input
            id="pin-input"
            ref={inputRef}
            inputMode="numeric"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
            maxLength={6}
            placeholder="••••"
            className="w-full px-3 py-2 text-base border border-input bg-background rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Enter your privacy PIN"
          />

          {error && (
            <div role="alert" className="text-destructive text-sm mb-2">
              {error}
              {attemptsLeft != null ? ` — ${attemptsLeft} attempts left` : null}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent border border-input rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Checking..." : "Reveal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
