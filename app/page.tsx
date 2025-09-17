"use client"

import { useState, useEffect } from "react"
import { TimeEntryForm } from "@/components/time-entry-form"
import { TimeEntryList } from "@/components/time-entry-list"
import { DatePicker } from "@/components/date-picker"
import { SummaryDashboard } from "@/components/summary-dashboard"
import { InvoiceGenerator } from "@/components/invoice-generator"
import { ExportManager } from "@/components/export-manager"
import { AIReportGenerator } from "@/components/ai-report-generator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TimeEntry } from "@/lib/types"
import { Clock, DollarSign, CalendarX, BarChart3, FileText, Download, Brain, LogOut, User } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

export default function TimeTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const selectedDateString = format(selectedDate, "yyyy-MM-dd")

  // Fetch entries
  const fetchEntries = async (date?: string) => {
    try {
      const url = date ? `/api/time-entries?date=${date}` : "/api/time-entries"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (error) {
      console.error("Error fetching entries:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load entries on mount and date change
  useEffect(() => {
    fetchEntries()
  }, [])

  // Handle form submission
  const handleSubmit = async (entryData: Omit<TimeEntry, "_id" | "createdAt" | "updatedAt" | "userId">) => {
    try {
      if (editingEntry) {
        // Update existing entry
        const response = await fetch(`/api/time-entries/${editingEntry._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entryData),
        })

        if (response.ok) {
          setEditingEntry(null)
          fetchEntries()
        }
      } else {
        // Create new entry
        const response = await fetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entryData),
        })

        if (response.ok) {
          fetchEntries()
        }
      }
    } catch (error) {
      console.error("Error saving entry:", error)
      throw error
    }
  }

  // Handle edit
  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setSelectedDate(new Date(entry.date + "T00:00:00"))
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchEntries()
      }
    } catch (error) {
      console.error("Error deleting entry:", error)
      throw error
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
      document.cookie = "auth-token=; path=/; max-age=0"
      try { localStorage.removeItem("auth-token") } catch {}
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Time Tracker</h1>
          <p className="text-muted-foreground">Track your work hours, manage leave, and analyze productivity. Configure your salary and working hours in Profile.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/profile")}>
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Date Selection */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
          </div>
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      </div>

      <Tabs defaultValue="log" className="space-y-6">
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
          <TimeEntryForm
            selectedDate={selectedDateString}
            onSubmit={handleSubmit}
            initialData={editingEntry || undefined}
            isEditing={!!editingEntry}
          />

          {editingEntry && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setEditingEntry(null)}>
                Cancel Edit
              </Button>
            </div>
          )}

          {/* Today's entries */}
          {todayEntries.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Today's Entries</h3>
              <TimeEntryList entries={todayEntries} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <TimeEntryList entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="summary">
          <SummaryDashboard entries={entries} />
        </TabsContent>

        <TabsContent value="invoice">
          <InvoiceGenerator />
        </TabsContent>

        <TabsContent value="export">
          <ExportManager />
        </TabsContent>

        <TabsContent value="ai-report">
          <AIReportGenerator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
