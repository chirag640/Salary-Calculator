"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Clock } from "lucide-react"
import { useCsrfToken } from "@/hooks/use-csrf"
import { useTimer, formatTimerDisplay } from "@/hooks/use-timer"

interface QuickStartTimerProps {
  selectedDate: string
  onEntryCreated: (entryId: string) => void
  onTimerStopped?: () => void
  className?: string
}

/**
 * Quick start timer - creates a new entry and starts timer immediately
 * Shows simplified form with running timer display
 */
export function QuickStartTimer({ selectedDate, onEntryCreated, onTimerStopped, className = "" }: QuickStartTimerProps) {
  const [loading, setLoading] = useState(false)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const [hourlyRate, setHourlyRate] = useState<number>(0)
  const [workDescription, setWorkDescription] = useState("")
  const { csrfToken, ensureCsrfToken } = useCsrfToken()

  const {
    timer,
    elapsedSeconds,
    isRunning,
    stopTimer: stopTimerHook,
    loading: timerLoading
  } = useTimer({
    entryId: activeEntryId || "",
    autoFetch: !!activeEntryId
  })

  // Fetch hourly rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(`/api/profile/hourly-rate?date=${selectedDate}`)
        if (res.ok) {
          const data = await res.json()
          setHourlyRate(data.hourlyRate || 0)
        }
      } catch (error) {
        console.error("Failed to fetch hourly rate:", error)
      }
    }
    fetchRate()
  }, [selectedDate])

  const handleQuickStart = async () => {
    if (hourlyRate <= 0) {
      alert("Please set your hourly rate in Profile first")
      return
    }

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
          workDescription: workDescription || "Quick timer entry",
          totalHours: 0,
          hourlyRate: hourlyRate
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

      setActiveEntryId(entryId)
      onEntryCreated(entryId)
    } catch (error) {
      console.error("Error quick starting timer:", error)
      alert(error instanceof Error ? error.message : "Failed to start timer")
    } finally {
      setLoading(false)
    }
  }

  const handleStopTimer = async () => {
    try {
      await stopTimerHook()
      setActiveEntryId(null)
      setWorkDescription("")
      if (onTimerStopped) {
        onTimerStopped()
      }
    } catch (error) {
      console.error("Failed to stop timer:", error)
      alert("Failed to stop timer")
    }
  }

  // Show running timer interface
  if (activeEntryId && isRunning) {
    return (
      <Card className={`border-2 border-green-500 shadow-lg ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-green-500 animate-pulse" />
            Timer Running
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Timer Display */}
          <div className="flex items-center justify-center py-2">
            <div className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-green-600 dark:text-green-400">
              {formatTimerDisplay(elapsedSeconds)}
            </div>
          </div>

          {/* Hourly Rate & Earnings - Side by side on mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Hourly Rate</Label>
              <div className="p-2 md:p-3 rounded-lg bg-muted text-base md:text-lg font-semibold">
                ${hourlyRate.toFixed(2)}/hr
              </div>
            </div>
            <div>
              <Label className="text-xs">Current Earnings</Label>
              <div className="p-2 md:p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-base md:text-lg font-bold text-green-600 dark:text-green-400">
                ${((elapsedSeconds / 3600) * hourlyRate).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Work Description */}
          <div>
            <Label htmlFor="quick-work-desc" className="text-sm">Work Description (Optional)</Label>
            <Textarea
              id="quick-work-desc"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="What are you working on?"
              rows={2}
              className="mt-1 resize-none text-sm"
            />
          </div>

          {/* Stop Button */}
          <Button
            onClick={handleStopTimer}
            disabled={timerLoading}
            variant="destructive"
            className="w-full gap-2 h-12 text-base font-semibold"
            size="lg"
          >
            <Square className="h-5 w-5" />
            Stop Timer
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show start button when no active timer
  return (
    <Button
      onClick={handleQuickStart}
      disabled={loading || hourlyRate <= 0}
      className={`gap-2 w-full sm:w-auto h-12 text-base font-semibold ${className}`}
      size="lg"
    >
      <Play className="h-5 w-5" />
      {loading ? "Starting..." : "Quick Start Timer"}
    </Button>
  )
}
