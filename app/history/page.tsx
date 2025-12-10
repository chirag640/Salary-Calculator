"use client";

import { useState, useEffect, useCallback } from "react";
import { TimeEntryList } from "@/components/time-entry-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TimeEntry } from "@/lib/types";
import { Clock, TrendingUp, DollarSign, Calendar, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useCsrfToken } from "@/hooks/use-csrf";
import { format, startOfWeek, endOfWeek } from "date-fns";
import MaskedValue from "@/components/ui/masked-value";

export default function HistoryPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showEarnings, setShowEarnings] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const { csrfToken, ensureCsrfToken} = useCsrfToken();

  const ITEMS_PER_PAGE = 30;

  // Fetch entries with pagination
  const fetchEntries = async (pageNum: number = 1) => {
    try {
      const params = new URLSearchParams();
      params.set("limit", String(ITEMS_PER_PAGE));
      params.set("skip", String((pageNum - 1) * ITEMS_PER_PAGE));

      const response = await fetch(`/api/time-entries?${params.toString()}`, {
        credentials: "same-origin",
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      const items = (data.items || []).map((e: any) => ({
        ...e,
        _id:
          typeof e?._id === "object" ? e?._id?.$oid || String(e?._id) : e?._id,
      }));

      setEntries(items);
      setHasMore(items.length === ITEMS_PER_PAGE);
    } catch (error) {
      toast({
        title: "Failed to load entries",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load earnings visibility setting
  useEffect(() => {
    const loadEarningsVisibility = async () => {
      try {
        const response = await fetch("/api/profile/earnings-visibility", {
          credentials: "same-origin",
        });
        if (response.ok) {
          const data = await response.json();
          setShowEarnings(data.showEarnings ?? false);
        }
      } catch (error) {
        console.error("Failed to load earnings visibility:", error);
      }
    };
    loadEarningsVisibility();
  }, []);

  // Load entries on mount and page change
  useEffect(() => {
    setLoading(true);
    fetchEntries(page);
  }, [page]);

  // Calculate quick stats
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekEntries = entries.filter((e) => {
    const date = new Date(e.date);
    return date >= weekStart && date <= weekEnd;
  });
  const weekHours = thisWeekEntries.reduce((sum, e) => sum + e.totalHours, 0);
  const weekEarnings = thisWeekEntries.reduce(
    (sum, e) => sum + e.totalEarnings,
    0
  );
  const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
  const totalEarnings = entries.reduce((sum, e) => sum + e.totalEarnings, 0);

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;

    try {
      setEntries((prev) => prev.filter((e) => e._id !== id));
      const token = csrfToken || (await ensureCsrfToken());

      const response = await fetch(`/api/time-entries/${id}`, {
        method: "DELETE",
        headers: token ? { "x-csrf-token": token } : {},
        credentials: "same-origin",
      });

      if (!response.ok) {
        fetchEntries(page);
        toast({ title: "Delete failed", variant: "destructive" });
      } else {
        toast({ title: "Entry deleted" });
      }
    } catch (error) {
      fetchEntries(page);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // Handle edit - navigate to main page with the entry
  const handleEdit = (entry: TimeEntry) => {
    // Store the entry to edit in sessionStorage so the main page can pick it up
    sessionStorage.setItem("editingEntry", JSON.stringify(entry));
    router.push(`/?date=${entry.date}`);
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      setPinError("PIN must be 4 digits");
      return;
    }

    try {
      const response = await fetch("/api/auth/pin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // PIN verified - now enable earnings visibility
        setShowPinDialog(false);
        setPin("");
        setPinError("");

        try {
          const token = csrfToken || (await ensureCsrfToken());
          const earningsResponse = await fetch("/api/profile/earnings-visibility", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "x-csrf-token": token } : {}),
            },
            credentials: "same-origin",
            body: JSON.stringify({ showEarnings: true }),
          });

          if (earningsResponse.ok) {
            setShowEarnings(true);
            toast({
              title: "Earnings visible",
              description: "PIN verified. Monetary values are now visible",
            });
          }
        } catch (error) {
          toast({
            title: "Failed to update earnings visibility",
            variant: "destructive",
          });
        }
      } else {
        // Wrong PIN
        setPinError(data.message || "Incorrect PIN. Please try again.");
        setPin("");
      }
    } catch (error) {
      console.error("PIN verification error:", error);
      setPinError("Failed to verify PIN. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">History</h1>
          <p className="text-muted-foreground">Your time tracking records</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (showEarnings) {
              // Hiding earnings - no PIN needed
              try {
                const token = csrfToken || (await ensureCsrfToken());
                const response = await fetch("/api/profile/earnings-visibility", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "x-csrf-token": token } : {}),
                  },
                  credentials: "same-origin",
                  body: JSON.stringify({ showEarnings: false }),
                });
                if (response.ok) {
                  setShowEarnings(false);
                  toast({
                    title: "Earnings hidden",
                    description: "Monetary values are now hidden",
                  });
                }
              } catch (error) {
                toast({
                  title: "Failed to update",
                  variant: "destructive",
                });
              }
            } else {
              // Showing earnings - require PIN
              setShowPinDialog(true);
            }
          }}
        >
          {showEarnings ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Earnings
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Show Earnings
            </>
          )}
        </Button>
      </div>

      {/* PIN Verification Dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Enter PIN to Show Earnings</CardTitle>
              <p className="text-sm text-muted-foreground">
                For security, please enter your 4-digit PIN
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pin-input">PIN</Label>
                <Input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                    setPinError("");
                  }}
                  placeholder="Enter 4-digit PIN"
                  className="text-2xl text-center tracking-widest"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && pin.length === 4) {
                      handlePinSubmit();
                    }
                  }}
                />
                {pinError && (
                  <p className="text-sm text-destructive mt-2">{pinError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPinDialog(false);
                    setPin("");
                    setPinError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePinSubmit}
                  disabled={pin.length !== 4}
                >
                  Verify PIN
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <span className="text-sm text-muted-foreground">This Week</span>
            </div>
            <div className="text-2xl font-bold">{weekHours.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground">
              {showEarnings ? (
                `$${weekEarnings.toFixed(0)}`
              ) : (
                <MaskedValue
                  value={weekEarnings}
                  format={(v) => `$${Number(v).toFixed(0)}`}
                  ariaLabel="Week earnings hidden"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-500 dark:text-green-400" />
              <span className="text-sm text-muted-foreground">Total Hours</span>
            </div>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground">
              {entries.length} entries
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-purple-500 dark:text-purple-400" />
              <span className="text-sm text-muted-foreground">
                Total Earnings
              </span>
            </div>
            <div className="text-2xl font-bold">
              {showEarnings ? (
                `$${totalEarnings.toFixed(0)}`
              ) : (
                <MaskedValue
                  value={totalEarnings}
                  format={(v) => `$${Number(v).toFixed(0)}`}
                  ariaLabel="Total earnings hidden"
                />
              )}
            </div>
            <div className="text-xs text-muted-foreground">All time</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              <span className="text-sm text-muted-foreground">Page</span>
            </div>
            <div className="text-2xl font-bold">{page}</div>
            <div className="text-xs text-muted-foreground">
              {ITEMS_PER_PAGE} per page
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Entries</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchEntries(page)}
          >
            Refresh
          </Button>
        </div>

        {entries.length > 0 ? (
          <>
            <TimeEntryList
              entries={entries}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || loading}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <Card className="py-16">
            <CardContent className="text-center">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">No entries</h3>
              <p className="text-sm text-muted-foreground">
                Start tracking time to see history
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
