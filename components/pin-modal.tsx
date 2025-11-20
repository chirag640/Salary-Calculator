"use client"

import React, { useEffect, useRef, useState } from "react"

type PinModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function PinModal({ open, onClose, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setPin("")
      setError(null)
      setAttemptsLeft(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message || "Incorrect PIN")
        if (typeof data?.attemptsLeft === "number") setAttemptsLeft(data.attemptsLeft)
        setLoading(false)
        return
      }

      // success
      setLoading(false)
      onSuccess()
      onClose()
    } catch (err) {
      setLoading(false)
      setError("Network error")
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      className="pin-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: 20,
          width: 360,
          borderRadius: 8,
          boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
        }}
      >
        <h2 id="pin-modal-title" style={{ margin: 0, marginBottom: 8 }}>
          Enter your privacy PIN
        </h2>
        <p style={{ marginTop: 0, color: "#444", fontSize: 13 }}>This keeps sensitive values hidden until you confirm.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="pin-input" style={{ display: "block", marginBottom: 6 }}>
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
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: 16,
              boxSizing: "border-box",
              marginBottom: 8,
            }}
            aria-label="Enter your privacy PIN"
          />

          {error && (
            <div role="alert" style={{ color: "#b82525", marginBottom: 8 }}>
              {error}
              {attemptsLeft != null ? ` — ${attemptsLeft} attempts left` : null}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 12px", background: "transparent", border: "1px solid #ddd", borderRadius: 6 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              style={{ padding: "8px 12px", background: "#111827", color: "white", border: "none", borderRadius: 6 }}
            >
              {loading ? "Checking..." : "Reveal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
