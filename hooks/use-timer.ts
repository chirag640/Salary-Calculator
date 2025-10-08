"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { TimerState } from "@/lib/types"
import { useCsrfToken } from "./use-csrf"

interface UseTimerOptions {
  entryId: string
  onTimerUpdate?: (timer: TimerState, elapsedSeconds: number) => void
  onIdleDetected?: (idleSeconds: number) => void
  heartbeatIntervalMs?: number
  autoFetch?: boolean
}

interface UseTimerReturn {
  timer: TimerState | null
  elapsedSeconds: number
  isRunning: boolean
  startTimer: () => Promise<void>
  pauseTimer: () => Promise<void>
  resumeTimer: () => Promise<void>
  stopTimer: () => Promise<void>
  sendHeartbeat: () => Promise<void>
  loading: boolean
  error: string | null
}

/**
 * Custom hook for managing persistent timers with idle detection
 * Handles timer state, heartbeat mechanism, and server sync
 */
export function useTimer({
  entryId,
  onTimerUpdate,
  onIdleDetected,
  heartbeatIntervalMs = 30000, // 30 seconds default
  autoFetch = true
}: UseTimerOptions): UseTimerReturn {
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { csrfToken, ensureCsrfToken } = useCsrfToken()

  // Fetch current timer state
  const fetchTimerState = useCallback(async () => {
    try {
      const response = await fetch(`/api/time-entries/${entryId}/timer`, {
        credentials: "same-origin"
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError("Entry not found")
          return
        }
        throw new Error("Failed to fetch timer state")
      }

      const data = await response.json()
      setTimer(data.timer)
      setElapsedSeconds(data.elapsedSeconds || 0)
      
      // Check for idle detection
      if (data.idleDetection?.isIdle && onIdleDetected) {
        onIdleDetected(data.idleDetection.idleSeconds)
      }

      if (onTimerUpdate) {
        onTimerUpdate(data.timer, data.elapsedSeconds || 0)
      }

      setError(null)
    } catch (err) {
      console.error("Error fetching timer state:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }, [entryId, onIdleDetected, onTimerUpdate])

  // Timer action helper
  const performTimerAction = useCallback(async (action: string) => {
    setLoading(true)
    setError(null)

    try {
      const token = csrfToken || await ensureCsrfToken()
      const response = await fetch(`/api/time-entries/${entryId}/timer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-csrf-token": token } : {})
        },
        credentials: "same-origin",
        body: JSON.stringify({
          action,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle idle detection warning
        if (response.status === 409 && errorData.idleWarning) {
          if (onIdleDetected) {
            onIdleDetected(errorData.idleWarning.idleSeconds)
          }
          throw new Error(errorData.idleWarning.message)
        }
        
        throw new Error(errorData.error || "Failed to perform timer action")
      }

      const data = await response.json()
      setTimer(data.timer)
      setElapsedSeconds(data.elapsedSeconds || 0)

      if (onTimerUpdate) {
        onTimerUpdate(data.timer, data.elapsedSeconds || 0)
      }

      setError(null)
    } catch (err) {
      console.error(`Error performing ${action}:`, err)
      setError(err instanceof Error ? err.message : "Unknown error")
      throw err
    } finally {
      setLoading(false)
    }
  }, [entryId, csrfToken, ensureCsrfToken, onIdleDetected, onTimerUpdate])

  // Timer actions
  const startTimer = useCallback(() => performTimerAction("start"), [performTimerAction])
  const pauseTimer = useCallback(() => performTimerAction("pause"), [performTimerAction])
  const resumeTimer = useCallback(() => performTimerAction("resume"), [performTimerAction])
  const stopTimer = useCallback(() => performTimerAction("stop"), [performTimerAction])
  const sendHeartbeat = useCallback(() => performTimerAction("heartbeat"), [performTimerAction])

  // Setup heartbeat interval when timer is running
  useEffect(() => {
    if (timer?.isRunning) {
      // Send heartbeat periodically
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat().catch(console.error)
      }, heartbeatIntervalMs)

      // Update local elapsed time display every second
      tickIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    } else {
      // Clear intervals when timer stops
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
    }

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)
    }
  }, [timer?.isRunning, heartbeatIntervalMs, sendHeartbeat])

  // Fetch timer state on mount and when entryId changes
  useEffect(() => {
    if (autoFetch && entryId) {
      fetchTimerState()
    }
  }, [entryId, autoFetch, fetchTimerState])

  // Sync on page visibility change (handle tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && timer?.isRunning) {
        fetchTimerState()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [timer?.isRunning, fetchTimerState])

  return {
    timer,
    elapsedSeconds,
    isRunning: timer?.isRunning || false,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    sendHeartbeat,
    loading,
    error
  }
}

/**
 * Format seconds into HH:MM:SS display
 */
export function formatTimerDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
