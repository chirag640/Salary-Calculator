"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { TimeEntryForm } from "@/components/time-entry-form"
import { TimeEntryList } from "@/components/time-entry-list"
import { DatePicker } from "@/components/date-picker"
import { SummaryDashboard } from "@/components/summary-dashboard"
import { InvoiceGenerator } from "@/components/invoice-generator"
import { ExportManager } from "@/components/export-manager"
import { AIReportGenerator } from "@/components/ai-report-generator"
import { QuickStartTimer } from "@/components/quick-start-timer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TimeEntry } from "@/lib/types"
import { Clock, DollarSign, CalendarX, BarChart3, FileText, Download, Brain, User } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { motion, fadeInUp, staggerContainer } from "@/components/motion"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useCsrfToken } from "@/hooks/use-csrf"

export default function TimeTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [historyItems, setHistoryItems] = useState<TimeEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>("log")
  const router = useRouter()
  const { toast } = useToast()
  const { csrfToken, ensureCsrfToken } = useCsrfToken()

  const selectedDateString = format(selectedDate, "yyyy-MM-dd")

  // Fetch entries
  const fetchEntries = async (date?: string, opts?: { append?: boolean; showDeleted?: boolean }) => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (date) params.set('date', date)
      if (opts?.showDeleted) params.set('showDeleted', 'true')
      const url = `/api/time-entries?${params.toString()}`
  const response = await fetch(url, { credentials: "same-origin" })
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []
        // Normalize _id to a string to ensure edit/delete routes work reliably
        const normalized = list.map((e: any) => ({
          ...e,
          _id:
            typeof e?._id === 'object'
              ? e?._id?.$oid || e?._id?.toString?.() || String(e?._id)
              : e?._id,
        }))
        if (opts?.append) {
          setHistoryItems(prev => [...prev, ...normalized])
        } else {
          setHistoryItems(normalized)
        }
        // For working set (today calculations etc.) we keep full loaded subset in entries
        setEntries(prev => opts?.append ? [...prev, ...normalized] : normalized)
        setNextCursor(data.nextCursor || null)
      }
    } catch (error) {
      console.error("Error fetching entries:", error)
      toast({
        title: "Failed to load entries",
        description: "Please refresh or try again shortly.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const [showDeleted, setShowDeleted] = useState(false)
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      params.set('cursor', nextCursor)
      if (showDeleted) params.set('showDeleted', 'true')
  const response = await fetch(`/api/time-entries?${params.toString()}`, { credentials: "same-origin" })
      if (response.ok) {
        const data = await response.json()
        const newItems = (data.items || []).map((e: any) => ({
          ...e,
          _id: typeof e?._id === 'object' ? e?._id?.$oid || e?._id?.toString?.() || String(e?._id) : e?._id,
        }))
        setHistoryItems((prev) => [...prev, ...newItems])
        setEntries(prev => [...prev, ...newItems])
        setNextCursor(data.nextCursor || null)
      }
    } catch (e) {
      console.error('Error loading more entries', e)
      toast({
        title: "Could not load more history",
        description: "Scrolling will retry automatically.",
        variant: "destructive",
      })
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore, showDeleted])

  // Load entries on mount and date change
  useEffect(() => {
    fetchEntries(undefined, { showDeleted })
  }, [showDeleted])

  // Infinite scroll observer for history tab
  useEffect(() => {
    if (!loadMoreRef.current) return
    const el = loadMoreRef.current
    const observer = new IntersectionObserver((entriesObs) => {
      if (entriesObs[0].isIntersecting) {
        loadMore()
      }
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, nextCursor])

  // Sync tab with URL hash (for anchors from AppShell)
  useEffect(() => {
    const validTabs = new Set(["log", "history", "summary", "invoice", "export", "ai-report"]) as Set<string>
    const syncFromHash = () => {
      if (typeof window === "undefined") return
      const h = window.location.hash?.replace("#", "")
      if (h && validTabs.has(h)) setTab(h)
    }
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  // Handle form submission
  const handleSubmit = async (entryData: Omit<TimeEntry, "_id" | "createdAt" | "updatedAt" | "userId">) => {
    try {
      if (editingEntry) {
        // Update existing entry
        // Optimistic update
        const optimisticId = editingEntry._id!
        const prev = entries
        const token = csrfToken || (await ensureCsrfToken())
        const response = await fetch(`/api/time-entries/${optimisticId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(token ? { "x-csrf-token": token } : {}) },
          credentials: "same-origin",
          body: JSON.stringify(entryData),
        })
        if (response.ok) {
          setEntries(prev.map(e => e._id === optimisticId ? { ...e, ...entryData, updatedAt: new Date() } as any : e))
          setHistoryItems(h => h.map(e => e._id === optimisticId ? { ...e, ...entryData, updatedAt: new Date() } as any : e))
          setEditingEntry(null)
          toast({
            title: "Entry updated",
            description: `Updated ${entryData.date || selectedDateString}.`,
          })
        } else {
          await fetchEntries()
          toast({
            title: "Update failed",
            description: "The server rejected the change.",
            variant: "destructive",
          })
        }
      } else {
        // Create new entry
        const token = csrfToken || (await ensureCsrfToken())
        const response = await fetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { "x-csrf-token": token } : {}) },
          credentials: "same-origin",
          body: JSON.stringify(entryData),
        })
        if (response.ok) {
          const created = await response.json()
          setEntries((prev) => [...prev, created])
          setHistoryItems((prev) => [created, ...prev])
          toast({
            title: "Entry logged",
            description: `${created.totalHours?.toFixed?.(2) || "0"}h on ${created.date}`,
          })
        } else {
            // Try to read server error details for better feedback
            let body: any = null
            try { body = await response.json() } catch {}
            await fetchEntries()
            // If server returned an overlapping entry, provide clear message
            if (body?.overlap) {
              const ov = body.overlap
              toast({
                title: `Could not create entry: Overlaps existing entry (${ov.timeIn} - ${ov.timeOut})`,
                description: ov.workDescription || `Existing: ${ov.totalHours}h`,
                variant: "destructive",
              })
            } else {
              toast({
                title: body?.error ? `Could not create entry: ${body.error}` : "Could not create entry",
                description: body?.details ? JSON.stringify(body.details) : (body?.issues ? JSON.stringify(body.issues) : "Please review your input and try again."),
                variant: "destructive",
              })
            }
        }
      }
    } catch (error) {
      console.error("Error saving entry:", error)
      toast({
        title: "Save failed",
        description: "Network or server error occurred.",
        variant: "destructive",
      })
    }
  }

  // Handle edit
  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setSelectedDate(new Date(entry.date + "T00:00:00"))
    // Ensure the form is visible when editing from History tab
    setTab('log')
    if (typeof window !== 'undefined') {
      const url = `${window.location.pathname}`
      window.history.replaceState(null, '', url)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      // Optimistic removal (soft delete in UI)
      const removedEntry = entries.find(e => e._id === id)
      setEntries(prev => prev.filter(e => e._id !== id))
      setHistoryItems(prev => prev.filter(e => e._id !== id))
  const token = csrfToken || (await ensureCsrfToken())
  const response = await fetch(`/api/time-entries/${id}`, { method: "DELETE", headers: token ? { "x-csrf-token": token } : {}, credentials: "same-origin" })
      if (!response.ok) {
        await fetchEntries()
        toast({
          title: "Delete failed",
          description: "Entry was restored.",
          variant: "destructive",
        })
        return
      }
      const json = await response.json().catch(() => ({}))
      const { restoreToken, expiresInMs } = json || {}
      let undo = false
      toast({
        title: "Entry deleted",
        description: "You can undo this action.",
            action: restoreToken ? (
            <ToastAction altText="Undo" onClick={async () => {
            if (!restoreToken) return
            undo = true
            try {
                const token = csrfToken || (await ensureCsrfToken())
                const r = await fetch(`/api/time-entries/${id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
                  credentials: 'same-origin',
                  body: JSON.stringify({ restoreToken }),
                })
              if (r.ok) {
                // Re-fetch just that entry (simpler: full fetch for now)
                await fetchEntries()
                toast({ title: 'Restored', description: 'Entry was brought back.' })
              } else {
                toast({ title: 'Undo failed', description: 'Restore window may have expired.', variant: 'destructive' })
              }
            } catch {
              toast({ title: 'Undo failed', description: 'Network error.', variant: 'destructive' })
            }
          }}>Undo</ToastAction>
        ) : undefined,
      })
      // Fallback: if undo not clicked and restore token exists, after expiry ensure not re-added
      if (restoreToken && removedEntry) {
        setTimeout(() => {
          // If undo occurred we already restored
          if (undo) return
          // Optionally could purge permanently later (cron job server-side). Client does nothing.
        }, Math.min(expiresInMs || 15000, 30000))
      }
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast({
        title: "Delete failed",
        description: "Network or server error occurred.",
        variant: "destructive",
      })
      try { await fetchEntries() } catch {}
    }
  }

  // Calculate totals for selected date
  const todayEntries = entries.filter((entry) => entry.date === selectedDateString)
  const todayTotalHours = todayEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
  const todayTotalEarnings = todayEntries.reduce((sum, entry) => sum + entry.totalEarnings, 0)
  const todayLeaveCount = todayEntries.filter((entry) => entry.leave?.isLeave).length

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      // HttpOnly cookie cleared server-side; client fallback removal not needed.
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

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
    )
  }

  return (
    <motion.div className="container mx-auto p-6 max-w-6xl" variants={staggerContainer} initial="hidden" animate="show">
      <div className="mb-8">
        <motion.div variants={fadeInUp}>
          <p className="text-muted-foreground">Track your work hours, manage leave, and analyze productivity. Configure your salary and working hours in Profile.</p>
        </motion.div>
      </div>

      {/* Date Selection */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
          </div>
          <Button variant="glass" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div variants={fadeInUp}>
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTotalHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">
              {todayEntries.length} {todayEntries.length === 1 ? "entry" : "entries"}
            </p>
          </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earnings Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${todayTotalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Based on logged hours</p>
          </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Today</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{todayLeaveCount}</div>
            <p className="text-xs text-muted-foreground">{todayLeaveCount > 0 ? "Day off" : "Work day"}</p>
          </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs value={tab} onValueChange={(v) => {
        setTab(v)
        // keep hash in URL for deep-linking
        if (typeof window !== "undefined") {
          const hash = v === "log" ? "" : `#${v}`
          const url = `${window.location.pathname}${hash}`
          window.history.replaceState(null, "", url)
        }
      }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="log">Log Time</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="summary">
            <BarChart3 className="h-4 w-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="invoice">
            <FileText className="h-4 w-4 mr-2" />
            Invoice
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </TabsTrigger>
          <TabsTrigger value="ai-report">
            <Brain className="h-4 w-4 mr-2" />
            AI Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-6">
          {/* Quick Start Timer Button */}
          {!editingEntry && (
            <div className="flex justify-center">
              <QuickStartTimer 
                selectedDate={selectedDateString}
                onEntryCreated={(entryId) => {
                  // Refresh entries to show the new timer
                  fetchEntries(undefined, { showDeleted })
                  toast({
                    title: "Timer started!",
                    description: "Your work timer is now running."
                  })
                }}
              />
            </div>
          )}

          <TimeEntryForm
            selectedDate={selectedDateString}
            onSubmit={handleSubmit}
            initialData={editingEntry || undefined}
            isEditing={!!editingEntry}
          />

          {editingEntry && (
            <div className="flex justify-center">
              <Button variant="glass" onClick={() => setEditingEntry(null)}>
                Cancel Edit
              </Button>
            </div>
          )}

          {/* Today's entries */}
          {todayEntries.length > 0 && (
            <motion.div variants={fadeInUp}>
              <h3 className="text-lg font-semibold mb-4">Today's Entries</h3>
              <TimeEntryList entries={todayEntries} onEdit={handleEdit} onDelete={handleDelete} />
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <motion.div variants={fadeInUp}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                  />
                  Show deleted
                </label>
                {showDeleted && <span className="text-muted-foreground">(soft-deleted items in red)</span>}
              </div>
              <Button size="sm" variant="outline" onClick={() => fetchEntries(undefined, { showDeleted })}>
                Refresh
              </Button>
            </div>
            <TimeEntryList entries={historyItems} onEdit={handleEdit} onDelete={handleDelete} />
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center text-xs text-muted-foreground">
              {nextCursor ? (loadingMore ? 'Loading more...' : 'Scroll to load more') : 'End of history'}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="summary">
          <motion.div variants={fadeInUp}>
            <SummaryDashboard entries={entries} />
          </motion.div>
        </TabsContent>

        <TabsContent value="invoice" id="invoice">
          <motion.div variants={fadeInUp}>
            <InvoiceGenerator />
          </motion.div>
        </TabsContent>

        <TabsContent value="export" id="export">
          <motion.div variants={fadeInUp}>
            <ExportManager />
          </motion.div>
        </TabsContent>

        <TabsContent value="ai-report" id="ai-report">
          <motion.div variants={fadeInUp}>
            <AIReportGenerator />
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
