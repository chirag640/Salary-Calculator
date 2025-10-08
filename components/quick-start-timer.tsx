"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { useCsrfToken } from "@/hooks/use-csrf"

interface QuickStartTimerProps {
  selectedDate: string
  onEntryCreated: (entryId: string) => void
  className?: string
}

/**
 * Quick start timer button - creates a new entry and starts timer immediately
 */
export function QuickStartTimer({ selectedDate, onEntryCreated, className = "" }: QuickStartTimerProps) {
  const [loading, setLoading] = useState(false)
  const { csrfToken, ensureCsrfToken } = useCsrfToken()

  const handleQuickStart = async () => {
    setLoading(true)
    try {
      const token = csrfToken || await ensureCsrfToken()
      
      // Create a new time entry
      const createResponse = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-csrf-token": token } : {})
        },
        credentials: "same-origin",
        body: JSON.stringify({
          date: selectedDate,
          timeIn: "",
          timeOut: "",
          breakMinutes: 0,
          workDescription: "Timer entry",
          totalHours: 0
        })
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || "Failed to create entry")
      }

      const entry = await createResponse.json()
      const entryId = entry._id

      // Start timer immediately
      const timerResponse = await fetch(`/api/time-entries/${entryId}/timer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-csrf-token": token } : {})
        },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "start",
          timestamp: new Date().toISOString()
        })
      })

      if (!timerResponse.ok) {
        throw new Error("Failed to start timer")
      }

      onEntryCreated(entryId)
    } catch (error) {
      console.error("Error quick starting timer:", error)
      alert(error instanceof Error ? error.message : "Failed to start timer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleQuickStart}
      disabled={loading}
      className={`gap-2 ${className}`}
      size="lg"
    >
      <Play className="h-5 w-5" />
      {loading ? "Starting..." : "Quick Start Timer"}
    </Button>
  )
}
