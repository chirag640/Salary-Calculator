"use client";

import { useState, useEffect, useCallback } from "react";
import { TimeEntryList } from "@/components/time-entry-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TimeEntry } from "@/lib/types";
import { Clock, TrendingUp, DollarSign, Calendar } from "lucide-react";
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
  const router = useRouter();
  const { toast } = useToast();
  const { csrfToken, ensureCsrfToken } = useCsrfToken();

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
      <div>
        <h1 className="text-3xl font-bold mb-2">History</h1>
        <p className="text-muted-foreground">Your time tracking records</p>
      </div>

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
              ${weekEarnings.toFixed(0)}
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
              ${totalEarnings.toFixed(0)}
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
