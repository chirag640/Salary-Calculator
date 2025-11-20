"use client";

import React, { useEffect, useMemo, useState } from "react";
import PinModal from "../pin-modal";

type MaskedValueProps = {
  value: string | number;
  format?: (v: string | number) => string;
  ariaLabel?: string;
  className?: string;
  ttlSeconds?: number;
};

export default function MaskedValue({
  value,
  format,
  ariaLabel,
  className,
  ttlSeconds = 300,
}: MaskedValueProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [expiry, setExpiry] = useState<number | null>(null);

  const text = useMemo(
    () => (format ? format(value) : String(value)),
    [value, format]
  );

  useEffect(() => {
    if (!revealed) return;
    if (!expiry) {
      const until = Date.now() + ttlSeconds * 1000;
      setExpiry(until);
    }

    const id = setInterval(() => {
      if (!expiry) return;
      if (Date.now() > expiry) {
        setRevealed(false);
        setExpiry(null);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [revealed, expiry, ttlSeconds]);

  function handleSuccess() {
    setRevealed(true);
    setExpiry(Date.now() + ttlSeconds * 1000);
  }

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <span
        aria-hidden={revealed}
        aria-label={ariaLabel || "Hidden value"}
        style={{
          filter: revealed ? "none" : "blur(6px)",
          transition: "filter 200ms ease",
          display: "inline-block",
          minWidth: 48,
        }}
      >
        {revealed ? (
          <span>{text}</span>
        ) : (
          <span
            style={{
              color: "transparent",
              textShadow: "0 0 6px rgba(0,0,0,0.5)",
            }}
          >
            {text}
          </span>
        )}
      </span>

      <div>
        {!revealed ? (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Reveal sensitive value"
            title="Reveal"
            className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-accent transition-colors"
          >
            Reveal
          </button>
        ) : (
          <button
            onClick={() => {
              setRevealed(false);
              setExpiry(null);
            }}
            aria-label="Hide sensitive value"
            title="Hide"
            className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-accent transition-colors"
          >
            Hide
          </button>
        )}
      </div>

      <PinModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
      />
    </span>
  );
}
