"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { TimeEntryList } from "@/components/time-entry-list"
import { SummaryDashboard } from "@/components/summary-dashboard"
import { Button } from "@/components/ui/button"
import type { TimeEntry } from "@/lib/types"
import { Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { MotionProvider, Motion, LazyAnimatePresence, fadeInUp, staggerContainer } from "@/components/motion"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useCsrfToken } from "@/hooks/use-csrf"

export default function HistoryPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [historyItems, setHistoryItems] = useState<TimeEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { csrfToken, ensureCsrfToken } = useCsrfToken()

  // Fetch entries
  const fetchEntries = async (date?: string, opts?: { append?: boolean; showDeleted?: boolean }) => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (date) params.set('date', date)
      if (opts?.showDeleted) params.set('showDeleted', 'true')
      const url = `/api/time-entries?${params.toString()}`
      const response = await fetch(url, { credentials: "same-origin" })
      if (!response.ok) {
        console.error("Failed to fetch entries:", response.statusText)
        return
      }
      const data = await response.json()
      const items = (data.items || []).map((e: any) => ({
        ...e,
        _id: typeof e?._id === 'object' ? e?._id?.$oid || e?._id?.toString?.() || String(e?._id) : e?._id,
      }))
      setEntries(items)
      setHistoryItems(items)
      setNextCursor(data.nextCursor || null)
    } catch (error) {
      console.error("Error fetching time entries:", error)
      toast({
        title: "Could not load time entries",
        description: "Please refresh or try again shortly.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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
  }, [nextCursor, loadingMore, showDeleted, toast])

  // Load entries on mount
  useEffect(() => {
    fetchEntries(undefined, { showDeleted })
  }, [showDeleted])

  // Infinite scroll observer
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

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const removedEntry = entries.find(e => e._id === id)
      setEntries(prev => prev.filter(e => e._id !== id))
      setHistoryItems(prev => prev.filter(e => e._id !== id))
      const token = csrfToken || (await ensureCsrfToken())
      const url = `/api/time-entries/${id}${showDeleted ? '?hard=true' : ''}`
      const response = await fetch(url, { 
        method: "DELETE", 
        headers: token ? { "x-csrf-token": token } : {}, 
        credentials: "same-origin" 
      })
      
      if (!response.ok) {
        await fetchEntries()
        toast({
          title: "Delete failed",
          description: "The server rejected the deletion.",
          variant: "destructive",
        })
        return
      }

      // Handle soft delete with undo option
      const body = await response.json().catch(() => null)
      const restoreToken = body?.restoreToken
      const expiresInMs = body?.expiresInMs
      let undo = false

      toast({
        title: "Entry deleted",
        description: restoreToken ? "Undo within 15s to restore." : "Entry removed permanently.",
        action: restoreToken ? (
          <ToastAction altText="Undo" onClick={async () => {
            undo = true
            try {
              const token = csrfToken || (await ensureCsrfToken())
              const undoRes = await fetch(`/api/time-entries/${id}/restore`, {
                method: 'POST',
                headers: { "Content-Type": "application/json", ...(token ? { "x-csrf-token": token } : {}) },
                credentials: 'same-origin',
                body: JSON.stringify({ restoreToken }),
              })
              if (undoRes.ok) {
                await fetchEntries(undefined, { showDeleted })
                toast({ title: 'Undo successful', description: 'Entry restored.' })
              } else {
                toast({ title: 'Undo failed', description: 'Restore window may have expired.', variant: 'destructive' })
              }
            } catch {
              toast({ title: 'Undo failed', description: 'Network error.', variant: 'destructive' })
            }
          }}>Undo</ToastAction>
        ) : undefined,
      })
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

  // Handle edit - navigate to main page with the entry
  const handleEdit = (entry: TimeEntry) => {
    // Store the entry to edit in sessionStorage so the main page can pick it up
    sessionStorage.setItem('editingEntry', JSON.stringify(entry))
    router.push(`/?date=${entry.date}`)
  }

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
    )
  }

  return (
    <MotionProvider>
    <Motion>
    <div className="container mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">History & Summary</h1>
        <p className="text-muted-foreground">View your complete time tracking history and analytics</p>
  </div>

      {/* Summary Dashboard */}
      <div className="mb-8">
        <SummaryDashboard entries={entries} />
      </div>

      {/* History List */}
  <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">All Entries</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-primary"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              Show deleted
            </label>
            <Button size="sm" variant="outline" onClick={() => fetchEntries(undefined, { showDeleted })}>
              Refresh
            </Button>
          </div>
        </div>
        
        {showDeleted && (
          <p className="text-xs text-muted-foreground mb-4">
            Soft-deleted items are shown in red
          </p>
        )}

        {historyItems.length > 0 ? (
          <TimeEntryList entries={historyItems} onEdit={handleEdit} onDelete={handleDelete} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No entries yet</h3>
            <p className="text-sm">Start tracking your time to see your history here</p>
          </div>
        )}

        <div ref={loadMoreRef} className="h-10 flex items-center justify-center text-xs text-muted-foreground mt-4">
          {nextCursor ? (loadingMore ? 'Loading more...' : 'Scroll to load more') : historyItems.length > 0 ? 'End of history' : ''}
        </div>
      </div>
    </div>
    </Motion>
    </MotionProvider>
  )
}
