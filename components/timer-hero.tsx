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
import { Play, Square, Clock, Zap } from "lucide-react";
import { useTimer, formatTimerDisplay } from "@/hooks/use-timer";
import { useCsrfToken } from "@/hooks/use-csrf";
import { cn } from "@/lib/utils";

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
  const [workDescription, setWorkDescription] = useState("");
  const [project, setProject] = useState("");
  const { csrfToken, ensureCsrfToken } = useCsrfToken();

  const {
    timer,
    elapsedSeconds,
    isRunning,
    stopTimer: stopTimerHook,
    loading: timerLoading,
  } = useTimer({
    entryId: activeEntryId || "",
    autoFetch: !!activeEntryId,
  });

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

  const handleStart = async () => {
    setLoading(true);
    try {
      const token = csrfToken || (await ensureCsrfToken());
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          date: selectedDate,
          timeIn: new Date().toISOString().split("T")[1].slice(0, 8),
          workDescription: workDescription || "Working...",
          project: project || undefined,
          startTimer: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActiveEntryId(data._id);
        onEntryCreated?.(data._id);
      }
    } catch (error) {
      console.error("Failed to start timer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeEntryId) return;
    setLoading(true);
    try {
      await stopTimerHook();
      setActiveEntryId(null);
      setWorkDescription("");
      setProject("");
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
        isRunning && "border-green-500 shadow-lg shadow-green-500/20",
        className
      )}
    >
      {/* Gradient Background */}
      {isRunning && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5" />
      )}

      <CardContent className="relative pt-8 pb-8">
        <div className="text-center space-y-6">
          {/* Timer Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className={cn("h-4 w-4", isRunning && "animate-pulse")} />
              <span>{isRunning ? "Timer Running" : "Ready to Start"}</span>
            </div>

            <div className="text-6xl md:text-7xl font-bold font-mono tracking-tight">
              {formatTimerDisplay(elapsedSeconds)}
            </div>

            {isRunning && (
              <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                ${currentEarnings.toFixed(2)}
              </div>
            )}
          </div>

          {/* Quick Input */}
          {!isRunning && (
            <div className="max-w-md mx-auto space-y-3">
              <div>
                <Input
                  placeholder="What are you working on?"
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  className="text-center text-lg h-12"
                />
              </div>
              <div>
                <Input
                  placeholder="Project (optional)"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="text-center"
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            {!isRunning ? (
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

          {/* Current Task */}
          {isRunning && workDescription && (
            <div className="max-w-md mx-auto">
              <div className="text-sm text-muted-foreground mb-1">
                Working on
              </div>
              <div className="text-lg font-medium">{workDescription}</div>
              {project && (
                <div className="text-sm text-muted-foreground">{project}</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
