"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TimeEntryForm } from "@/components/time-entry-form";
import { TimeEntryList } from "@/components/time-entry-list";
import { DatePicker } from "@/components/date-picker";
import { TimerHero } from "@/components/timer-hero";
import { StatsGrid } from "@/components/stats-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimeEntry } from "@/lib/types";
import { Clock, DollarSign, CalendarX, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import {
  MotionProvider,
  Motion,
  LazyAnimatePresence,
  fadeInUp,
  staggerContainer,
} from "@/components/motion";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useCsrfToken } from "@/hooks/use-csrf";
import { cn } from "@/lib/utils";

export default function TimeTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [historyItems, setHistoryItems] = useState<TimeEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { csrfToken, ensureCsrfToken } = useCsrfToken();

  const selectedDateString = format(selectedDate, "yyyy-MM-dd");
  const todayString = format(new Date(), "yyyy-MM-dd");

  // Fetch entries
  const fetchEntries = async (
    date?: string,
    opts?: { append?: boolean; showDeleted?: boolean },
  ) => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (date) params.set("date", date);
      if (opts?.showDeleted) params.set("showDeleted", "true");
      const url = `/api/time-entries?${params.toString()}`;
      const response = await fetch(url, { credentials: "same-origin" });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];
        // Normalize _id to a string to ensure edit/delete routes work reliably
        const normalized = list.map((e: any) => ({
          ...e,
          _id:
            typeof e?._id === "object"
              ? e?._id?.$oid || e?._id?.toString?.() || String(e?._id)
              : e?._id,
        }));
        if (opts?.append) {
          setHistoryItems((prev) => [...prev, ...normalized]);
        } else {
          setHistoryItems(normalized);
        }
        // For working set (today calculations etc.) we keep full loaded subset in entries
        setEntries((prev) =>
          opts?.append ? [...prev, ...normalized] : normalized,
        );
        setNextCursor(data.nextCursor || null);
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast({
        title: "Failed to load entries",
        description: "Please refresh or try again shortly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("cursor", nextCursor);
      if (showDeleted) params.set("showDeleted", "true");
      const response = await fetch(`/api/time-entries?${params.toString()}`, {
        credentials: "same-origin",
      });
      if (response.ok) {
        const data = await response.json();
        const newItems = (data.items || []).map((e: any) => ({
          ...e,
          _id:
            typeof e?._id === "object"
              ? e?._id?.$oid || e?._id?.toString?.() || String(e?._id)
              : e?._id,
        }));
        setHistoryItems((prev) => [...prev, ...newItems]);
        setEntries((prev) => [...prev, ...newItems]);
        setNextCursor(data.nextCursor || null);
      }
    } catch (e) {
      console.error("Error loading more entries", e);
      toast({
        title: "Could not load more history",
        description: "Scrolling will retry automatically.",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, showDeleted]);

  // Load entries on mount and date change
  useEffect(() => {
    fetchEntries(undefined, { showDeleted });

    // Check if we're editing an entry from history page
    const editingEntryStr = sessionStorage.getItem("editingEntry");
    if (editingEntryStr) {
      try {
        const entry = JSON.parse(editingEntryStr);
        setEditingEntry(entry);
        setSelectedDate(new Date(entry.date + "T00:00:00"));
        sessionStorage.removeItem("editingEntry");
      } catch (e) {
        console.error("Failed to parse editing entry:", e);
      }
    }

    // Check if there's a date parameter in URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get("date");
      if (dateParam) {
        try {
          setSelectedDate(new Date(dateParam + "T00:00:00"));
        } catch (e) {
          console.error("Failed to parse date parameter:", e);
        }
      }
    }
  }, [showDeleted]);

  // Infinite scroll observer for history tab
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entriesObs) => {
        if (entriesObs[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  // Handle form submission
  const handleSubmit = async (
    entryData: Omit<TimeEntry, "_id" | "createdAt" | "updatedAt" | "userId">,
  ) => {
    try {
      if (editingEntry) {
        // Update existing entry
        // Optimistic update
        const optimisticId = editingEntry._id!;
        const prev = entries;
        const token = csrfToken || (await ensureCsrfToken());
        const response = await fetch(`/api/time-entries/${optimisticId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-csrf-token": token } : {}),
          },
          credentials: "same-origin",
          body: JSON.stringify(entryData),
        });
        if (response.ok) {
          setEntries(
            prev.map((e) =>
              e._id === optimisticId
                ? ({ ...e, ...entryData, updatedAt: new Date() } as any)
                : e,
            ),
          );
          setHistoryItems((h) =>
            h.map((e) =>
              e._id === optimisticId
                ? ({ ...e, ...entryData, updatedAt: new Date() } as any)
                : e,
            ),
          );
          setEditingEntry(null);
          toast({
            title: "Entry updated",
            description: `Updated ${entryData.date || selectedDateString}.`,
          });
        } else {
          await fetchEntries();
          toast({
            title: "Update failed",
            description: "The server rejected the change.",
            variant: "destructive",
          });
        }
      } else {
        // Create new entry
        const token = csrfToken || (await ensureCsrfToken());
        const response = await fetch("/api/time-entries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-csrf-token": token } : {}),
          },
          credentials: "same-origin",
          body: JSON.stringify(entryData),
        });
        if (response.ok) {
          const created = await response.json();
          setEntries((prev) => [...prev, created]);
          setHistoryItems((prev) => [created, ...prev]);
          toast({
            title: "Entry logged",
            description: `${created.totalHours?.toFixed?.(2) || "0"}h on ${
              created.date
            }`,
          });
        } else {
          // Try to read server error details for better feedback
          let body: any = null;
          try {
            body = await response.json();
          } catch {}
          await fetchEntries();
          // If server returned an overlapping entry, provide clear message
          if (body?.overlap) {
            const ov = body.overlap;
            toast({
              title: `Could not create entry: Overlaps existing entry (${ov.timeIn} - ${ov.timeOut})`,
              description: ov.workDescription || `Existing: ${ov.totalHours}h`,
              variant: "destructive",
            });
          } else {
            toast({
              title: body?.error
                ? `Could not create entry: ${body.error}`
                : "Could not create entry",
              description: body?.details
                ? JSON.stringify(body.details)
                : body?.issues
                  ? JSON.stringify(body.issues)
                  : "Please review your input and try again.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      toast({
        title: "Save failed",
        description: "Network or server error occurred.",
        variant: "destructive",
      });
    }
  };

  // Handle edit
  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setSelectedDate(new Date(entry.date + "T00:00:00"));
    // Scroll to top when editing
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      // Optimistic removal (soft delete in UI)
      const removedEntry = entries.find((e) => e._id === id);
      setEntries((prev) => prev.filter((e) => e._id !== id));
      setHistoryItems((prev) => prev.filter((e) => e._id !== id));
      const token = csrfToken || (await ensureCsrfToken());
      const url = `/api/time-entries/${id}${showDeleted ? "?hard=true" : ""}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: token ? { "x-csrf-token": token } : {},
        credentials: "same-origin",
      });
      if (!response.ok) {
        await fetchEntries();
        toast({
          title: "Delete failed",
          description: "Entry was restored.",
          variant: "destructive",
        });
        return;
      }
      const json = await response.json().catch(() => ({}));
      const { restoreToken, expiresInMs } = json || {};
      let undo = false;
      toast({
        title: "Entry deleted",
        description: "You can undo this action.",
        action: restoreToken ? (
          <ToastAction
            altText="Undo"
            onClick={async () => {
              if (!restoreToken) return;
              undo = true;
              try {
                const token = csrfToken || (await ensureCsrfToken());
                const r = await fetch(`/api/time-entries/${id}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "x-csrf-token": token } : {}),
                  },
                  credentials: "same-origin",
                  body: JSON.stringify({ restoreToken }),
                });
                if (r.ok) {
                  // Re-fetch just that entry (simpler: full fetch for now)
                  await fetchEntries();
                  toast({
                    title: "Restored",
                    description: "Entry was brought back.",
                  });
                } else {
                  toast({
                    title: "Undo failed",
                    description: "Restore window may have expired.",
                    variant: "destructive",
                  });
                }
              } catch {
                toast({
                  title: "Undo failed",
                  description: "Network error.",
                  variant: "destructive",
                });
              }
            }}
          >
            Undo
          </ToastAction>
        ) : undefined,
      });
      // Fallback: if undo not clicked and restore token exists, after expiry ensure not re-added
      if (restoreToken && removedEntry) {
        setTimeout(
          () => {
            // If undo occurred we already restored
            if (undo) return;
            // Optionally could purge permanently later (cron job server-side). Client does nothing.
          },
          Math.min(expiresInMs || 15000, 30000),
        );
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        title: "Delete failed",
        description: "Network or server error occurred.",
        variant: "destructive",
      });
      try {
        await fetchEntries();
      } catch {}
    }
  };

  // Keyboard shortcuts - must be before early return
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // T = Jump to today
      if (e.key === "t" || e.key === "T") {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const target = e.target as HTMLElement;
          // Don't trigger if user is typing in an input/textarea
          if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
            e.preventDefault();
            setSelectedDate(new Date());
            toast({
              title: "Jumped to today",
              description: format(new Date(), "EEEE, MMMM d, yyyy"),
            });
          }
        }
      }
      // Arrow left = previous day
      if (e.key === "ArrowLeft" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        setSelectedDate(prev);
      }
      // Arrow right = next day
      if (e.key === "ArrowRight" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        setSelectedDate(next);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDate, toast]);

  // Listen for custom navigate-to-date event from calendar panel
  useEffect(() => {
    const handleNavigateToDate = (e: CustomEvent) => {
      if (e.detail && e.detail instanceof Date) {
        setSelectedDate(e.detail);
        toast({
          title: "Navigated to event date",
          description: format(e.detail, "EEEE, MMMM d, yyyy"),
        });
      }
    };
    window.addEventListener("navigate-to-date", handleNavigateToDate as any);
    return () =>
      window.removeEventListener(
        "navigate-to-date",
        handleNavigateToDate as any,
      );
  }, [toast]);

  // Calculate totals for selected date
  const todayEntries = entries.filter(
    (entry) => entry.date === selectedDateString,
  );
  const todayTotalHours = todayEntries.reduce(
    (sum, entry) => sum + entry.totalHours,
    0,
  );
  const todayTotalEarnings = todayEntries.reduce(
    (sum, entry) => sum + entry.totalEarnings,
    0,
  );
  const todayLeaveCount = todayEntries.filter(
    (entry) => entry.leave?.isLeave,
  ).length;

  const isToday = selectedDateString === todayString;
  const isPastDate = selectedDateString < todayString;

  // Calculate week stats
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEntries = entries.filter((e) => {
    const entryDate = new Date(e.date + "T00:00:00");
    return entryDate >= weekStart && entryDate <= weekEnd;
  });
  const weekHours = weekEntries.reduce((sum, e) => sum + e.totalHours, 0);
  const weekEarnings = weekEntries.reduce((sum, e) => sum + e.totalEarnings, 0);

  // Calculate streak (consecutive days with entries)
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const calculateStreak = () => {
      const sortedDates = [...new Set(entries.map((e) => e.date))]
        .sort()
        .reverse();
      let count = 0;
      let checkDate = new Date();

      for (const dateStr of sortedDates) {
        const entryDate = new Date(dateStr + "T00:00:00");
        const expectedDate = new Date(checkDate);
        expectedDate.setDate(expectedDate.getDate() - count);

        if (
          format(entryDate, "yyyy-MM-dd") === format(expectedDate, "yyyy-MM-dd")
        ) {
          count++;
        } else {
          break;
        }
      }
      setStreak(count);
    };
    calculateStreak();
  }, [entries]);

  // Get top project this week
  const projectHours = weekEntries.reduce(
    (acc, e) => {
      const proj = e.project || "No Project";
      acc[proj] = (acc[proj] || 0) + e.totalHours;
      return acc;
    },
    {} as Record<string, number>,
  );
  const topProject = Object.entries(projectHours).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];

  // Calculate total stats for achievements
  const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
  const totalEntries = entries.length;

  const [showManualEntry, setShowManualEntry] = useState(false);

  // Timer/Manual toggle with localStorage persistence
  const [showTimerHero, setShowTimerHero] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("showTimerHero");
      return saved !== "false"; // Default to true (show timer)
    }
    return true;
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      // HttpOnly cookie cleared server-side; client fallback removal not needed.
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading time tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MotionProvider>
      <Motion>
        <div className="container mx-auto p-3 md:p-6 max-w-7xl space-y-4 md:space-y-8">
          {/* Hero Timer Section */}
          {isToday && showTimerHero && (
            <div className="max-w-3xl mx-auto">
              <TimerHero
                selectedDate={selectedDateString}
                onEntryCreated={(entryId) => {
                  fetchEntries(undefined, { showDeleted });
                  toast({
                    title: "Timer started!",
                    description: "Your work timer is now running.",
                  });
                }}
                onTimerStopped={() => {
                  fetchEntries(undefined, { showDeleted });
                  toast({
                    title: "Timer stopped",
                    description: "Your work session has been saved.",
                  });
                }}
              />
            </div>
          )}

          {/* Date Navigation & Manual Entry */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
              {!isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Timer/Manual Toggle */}
              {isToday && (
                <Button
                  onClick={() => {
                    const newValue = !showTimerHero;
                    setShowTimerHero(newValue);
                    localStorage.setItem("showTimerHero", String(newValue));
                    if (!newValue) {
                      setShowManualEntry(true); // Auto-open manual entry when hiding timer
                    }
                    toast({
                      title: newValue ? "Timer view" : "Manual entry view",
                      description: newValue
                        ? "Timer is now visible"
                        : "Manual entry form is now visible",
                    });
                  }}
                  variant={showTimerHero ? "outline" : "default"}
                  size="sm"
                >
                  {showTimerHero ? "Manual Entry" : "Show Timer"}
                </Button>
              )}

              {!todayEntries.some((e) => e.timer?.isRunning) &&
                showTimerHero && (
                  <Button
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    variant={showManualEntry ? "default" : "outline"}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {showManualEntry ? "Hide Form" : "Add Entry"}
                  </Button>
                )}
            </div>
          </div>

          {/* Manual Entry Form */}
          {(showManualEntry || !showTimerHero) &&
            !todayEntries.some((e) => e.timer?.isRunning) && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingEntry ? "Edit Entry" : "Add Manual Entry"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!editingEntry ? (
                      <TimeEntryForm
                        selectedDate={selectedDateString}
                        onSubmit={(data) => {
                          handleSubmit(data);
                          setShowManualEntry(false);
                        }}
                        initialData={undefined}
                        isEditing={false}
                      />
                    ) : (
                      <>
                        <TimeEntryForm
                          selectedDate={selectedDateString}
                          onSubmit={(data) => {
                            handleSubmit(data);
                            setEditingEntry(null);
                            setShowManualEntry(false);
                          }}
                          initialData={editingEntry}
                          isEditing={true}
                        />
                        <div className="flex justify-center mt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingEntry(null);
                              setShowManualEntry(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Entries List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {isToday
                  ? "Today's Entries"
                  : format(selectedDate, "EEEE, MMMM d")}
              </h3>
              {todayEntries.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {todayEntries.length}{" "}
                  {todayEntries.length === 1 ? "entry" : "entries"}
                </span>
              )}
            </div>

            {todayEntries.length > 0 ? (
              <TimeEntryList
                entries={todayEntries}
                onEdit={(entry) => {
                  setEditingEntry(entry);
                  setShowManualEntry(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDelete={handleDelete}
              />
            ) : (
              <Card className="py-16">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Clock className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    {isToday
                      ? "Start your timer above or add a manual entry to begin tracking your time."
                      : "No time entries for this date. Select today or add a manual entry."}
                  </p>
                  {!isToday && (
                    <Button onClick={() => setSelectedDate(new Date())}>
                      Go to Today
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Motion>
    </MotionProvider>
  );
}
