"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Square, Clock } from "lucide-react";
import MaskedValue from "@/components/ui/masked-value";
import { useTimer, formatTimerDisplay } from "@/hooks/use-timer";
import { useCsrfToken } from "@/hooks/use-csrf";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TimerHeroProps {
  selectedDate: string;
  onEntryCreated?: (entryId: string) => void;
  onTimerStopped?: () => void;
  className?: string;
}

export function TimerHero({
  selectedDate,
  onEntryCreated,
  onTimerStopped,
  className,
}: TimerHeroProps) {
  const [loading, setLoading] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [finalWorkDescription, setFinalWorkDescription] = useState("");
  const [finalProject, setFinalProject] = useState("");
  const { csrfToken, ensureCsrfToken } = useCsrfToken();

  const [localElapsedSeconds, setLocalElapsedSeconds] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(
    null
  );

  const {
    timer,
    elapsedSeconds: hookElapsedSeconds,
    isRunning,
    stopTimer: stopTimerHook,
    loading: timerLoading,
  } = useTimer({
    entryId: activeEntryId || "",
    autoFetch: false,
  });

  const elapsedSeconds = localElapsedSeconds || hookElapsedSeconds;

  // Fetch hourly rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(
          `/api/profile/hourly-rate?date=${selectedDate}`,
          { credentials: "same-origin" }
        );
        if (res.ok) {
          const data = await res.json();
          if (typeof data.hourlyRate === "number")
            setHourlyRate(data.hourlyRate);
        }
      } catch (e) {}
    };
    fetchRate();
  }, [selectedDate]);

  const currentEarnings = (elapsedSeconds / 3600) * hourlyRate;

  // Cleanup timer interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    };
  }, [timerIntervalId]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const token = csrfToken || (await ensureCsrfToken());

      // Create time entry
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          date: selectedDate,
          workDescription: "Working...",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const entryId = data._id;

        // Start timer immediately
        const timerResponse = await fetch(
          `/api/time-entries/${entryId}/timer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "x-csrf-token": token } : {}),
            },
            credentials: "same-origin",
            body: JSON.stringify({
              action: "start",
              timestamp: new Date().toISOString(),
            }),
          }
        );

        if (timerResponse.ok) {
          setActiveEntryId(entryId);
          setLocalElapsedSeconds(0);

          // Start local timer tick
          const intervalId = setInterval(() => {
            setLocalElapsedSeconds((prev) => prev + 1);
          }, 1000);
          setTimerIntervalId(intervalId);

          onEntryCreated?.(entryId);
        }
      }
    } catch (error) {
      console.error("Failed to start timer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (!activeEntryId) return;
    setFinalWorkDescription("");
    setFinalProject("");
    setShowStopDialog(true);
  };

  const confirmStop = async () => {
    if (!finalWorkDescription.trim()) {
      return; // Don't allow empty description
    }

    setLoading(true);
    try {
      const token = csrfToken || (await ensureCsrfToken());

      // First update the entry with final description
      const updateResponse = await fetch(`/api/time-entries/${activeEntryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          date: selectedDate,
          workDescription: finalWorkDescription,
          project: finalProject || undefined,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update description");
      }

      // Then stop the timer via API
      const token2 = csrfToken || (await ensureCsrfToken());
      await fetch(`/api/time-entries/${activeEntryId}/timer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token2 ? { "x-csrf-token": token2 } : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "stop",
          timestamp: new Date().toISOString(),
        }),
      });

      // Clear timer interval and reset state immediately
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }

      setActiveEntryId(null);
      setLocalElapsedSeconds(0);
      setShowStopDialog(false);
      setFinalWorkDescription("");
      setFinalProject("");
      onTimerStopped?.();
    } catch (error) {
      console.error("Failed to stop timer:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        activeEntryId && "border-green-500 shadow-lg shadow-green-500/20",
        className
      )}
    >
      {/* Gradient Background */}
      {activeEntryId && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5" />
      )}

      <CardContent className="relative pt-8 pb-8">
        <div className="text-center space-y-6">
          {/* Timer Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock
                className={cn("h-4 w-4", activeEntryId && "animate-pulse")}
              />
              <span>{activeEntryId ? "Timer Running" : "Ready to Start"}</span>
            </div>

            <div className="text-6xl md:text-7xl font-bold font-mono tracking-tight">
              {formatTimerDisplay(elapsedSeconds)}
            </div>

            {activeEntryId && (
              <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                <MaskedValue
                  value={currentEarnings}
                  format={(v) => `$${Number(v).toFixed(2)}`}
                />
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            {!activeEntryId ? (
              <Button
                onClick={handleStart}
                disabled={loading}
                size="lg"
                className="h-24 w-24 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                aria-label="Start timer"
              >
                {loading ? (
                  <Clock className="h-8 w-8 animate-spin" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Play className="h-8 w-8 mb-1" />
                    <span className="text-xs">START</span>
                  </div>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleStop}
                disabled={loading || timerLoading}
                size="lg"
                variant="destructive"
                className="h-24 w-24 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                aria-label="Stop timer"
              >
                {loading || timerLoading ? (
                  <Clock className="h-8 w-8 animate-spin" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Square className="h-8 w-8 mb-1" />
                    <span className="text-xs">STOP</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Stop Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What did you work on?</DialogTitle>
            <DialogDescription>
              Please describe what you accomplished before stopping the timer.
              This is required to save your time entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="final-work-description">
                Work Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="final-work-description"
                placeholder="E.g., Fixed bug in user authentication, Created homepage design, etc."
                value={finalWorkDescription}
                onChange={(e) => setFinalWorkDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
              {!finalWorkDescription.trim() && (
                <p className="text-xs text-destructive">
                  This field is required
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-project">Project (Optional)</Label>
              <Input
                id="final-project"
                placeholder="Project name"
                value={finalProject}
                onChange={(e) => setFinalProject(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Time tracked:</span>
                <span className="font-mono font-semibold">
                  {formatTimerDisplay(elapsedSeconds)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Earnings:</span>
                <span className="font-semibold">
                  <MaskedValue
                    value={currentEarnings}
                    format={(v: string | number) => `$${Number(v).toFixed(2)}`}
                  />
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStopDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStop}
              disabled={!finalWorkDescription.trim() || loading}
            >
              {loading ? "Stopping..." : "Stop Timer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
