"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Square, Clock, AlertTriangle } from "lucide-react"
import { useTimer, formatTimerDisplay } from "@/hooks/use-timer"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TimerControlsProps {
  entryId: string
  onTimerStop?: () => void
  className?: string
}

export function TimerControls({ entryId, onTimerStop, className = "" }: TimerControlsProps) {
  const [showIdleDialog, setShowIdleDialog] = useState(false)
  const [idleSeconds, setIdleSeconds] = useState(0)
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null)

  const {
    timer,
    elapsedSeconds,
    isRunning,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    loading,
    error
  } = useTimer({
    entryId,
    onIdleDetected: (seconds) => {
      setIdleSeconds(seconds)
      setShowIdleDialog(true)
    },
    onTimerUpdate: (timer, elapsed) => {
      // Optional: Could trigger parent updates here
    }
  })

  const handleStart = async () => {
    try {
      await startTimer()
    } catch (err) {
      console.error("Failed to start timer:", err)
    }
  }

  const handlePause = async () => {
    try {
      await pauseTimer()
    } catch (err) {
      if (err instanceof Error && err.message.includes("Idle time detected")) {
        setPendingAction(() => pauseTimer)
      } else {
        console.error("Failed to pause timer:", err)
      }
    }
  }

  const handleResume = async () => {
    try {
      await resumeTimer()
    } catch (err) {
      console.error("Failed to resume timer:", err)
    }
  }

  const handleStop = async () => {
    try {
      await stopTimer()
      if (onTimerStop) {
        onTimerStop()
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Idle time detected")) {
        setPendingAction(() => stopTimer)
      } else {
        console.error("Failed to stop timer:", err)
      }
    }
  }

  const handleIdleConfirm = async () => {
    setShowIdleDialog(false)
    if (pendingAction) {
      try {
        await pendingAction()
        setPendingAction(null)
      } catch (err) {
        console.error("Failed to execute pending action:", err)
      }
    }
  }

  const handleIdleDiscard = () => {
    setShowIdleDialog(false)
    setPendingAction(null)
    // Could implement additional logic to subtract idle time
  }

  if (!timer && !loading) {
    return (
      <Card className={`hover:translate-y-[-1px] transition-transform ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No timer running</span>
            </div>
            <Button 
              onClick={handleStart} 
              size="sm" 
              disabled={loading}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Start Timer
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={`hover:translate-y-[-1px] transition-transform ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Timer Display */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className={`h-5 w-5 ${isRunning ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                <div className="font-mono text-2xl font-bold">
                  {formatTimerDisplay(elapsedSeconds)}
                </div>
              </div>
              {isRunning && (
                <Badge variant="default" className="bg-green-500">
                  Running
                </Badge>
              )}
              {!isRunning && timer && elapsedSeconds > 0 && (
                <Badge variant="secondary">
                  Paused
                </Badge>
              )}
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-2">
              {!isRunning && elapsedSeconds === 0 && (
                <Button 
                  onClick={handleStart} 
                  size="sm" 
                  disabled={loading}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              )}
              
              {isRunning && (
                <Button 
                  onClick={handlePause} 
                  size="sm" 
                  variant="outline"
                  disabled={loading}
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
              
              {!isRunning && elapsedSeconds > 0 && timer?.status === "paused" && (
                <Button 
                  onClick={handleResume} 
                  size="sm" 
                  disabled={loading}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
              )}
              
              {!isRunning && elapsedSeconds > 0 && timer?.status === "stopped" && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Stopped
                </Badge>
              )}
              
              {(isRunning || timer?.status === "paused") && (
                <Button 
                  onClick={handleStop} 
                  size="sm" 
                  variant="destructive"
                  disabled={loading}
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Idle Detection Dialog */}
      <AlertDialog open={showIdleDialog} onOpenChange={setShowIdleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Idle Time Detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              No activity detected for approximately <strong>{Math.floor(idleSeconds / 60)} minutes</strong>.
              <br /><br />
              Would you like to keep this time or discard the idle period?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleIdleDiscard}>
              Discard Idle Time
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleIdleConfirm}>
              Keep All Time
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
