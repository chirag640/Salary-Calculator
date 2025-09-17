"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Clock, DollarSign, Briefcase, CalendarX } from "lucide-react"
import type { TimeEntry, PeriodSummary, ProjectSummary, ProfileResponse } from "@/lib/types"
import { format, startOfWeek, startOfMonth, parseISO } from "date-fns"

interface SummaryDashboardProps {
  entries: TimeEntry[]
}

export function SummaryDashboard({ entries }: SummaryDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">("week")
  const [selectedClient, setSelectedClient] = useState<string>("all")
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [profile, setProfile] = useState<ProfileResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile")
        if (res.ok) {
          const data: ProfileResponse = await res.json()
          setProfile(data)
        }
      } catch {}
    }
    load()
  }, [])

  // Get unique clients and projects
  const clients = Array.from(new Set(entries.filter((e) => e.client).map((e) => e.client!)))
  const projects = Array.from(new Set(entries.filter((e) => e.project).map((e) => e.project!)))

  // Filter entries based on selections
  const filteredEntries = entries.filter((entry) => {
    if (selectedClient !== "all" && entry.client !== selectedClient) return false
    if (selectedProject !== "all" && entry.project !== selectedProject) return false
    return true
  })

  // Calculate summary data
  const calculateSummary = (): PeriodSummary => {
    const daily: { [date: string]: any } = {}
    const weekly: { [week: string]: any } = {}
    const monthly: { [month: string]: any } = {}
    const projectMap: { [key: string]: ProjectSummary } = {}

    filteredEntries.forEach((entry) => {
      const date = entry.date
      const weekStart = format(startOfWeek(parseISO(date)), "yyyy-MM-dd")
      const monthStart = format(startOfMonth(parseISO(date)), "yyyy-MM")

      // Daily aggregation
      if (!daily[date]) {
        daily[date] = { totalHours: 0, totalEarnings: 0, entriesCount: 0, leaveCount: 0 }
      }
      daily[date].totalHours += entry.totalHours
      daily[date].totalEarnings += entry.totalEarnings
      daily[date].entriesCount += 1
      if (entry.leave?.isLeave) daily[date].leaveCount += 1

      // Weekly aggregation
      if (!weekly[weekStart]) {
        weekly[weekStart] = { totalHours: 0, totalEarnings: 0, entriesCount: 0, leaveCount: 0 }
      }
      weekly[weekStart].totalHours += entry.totalHours
      weekly[weekStart].totalEarnings += entry.totalEarnings
      weekly[weekStart].entriesCount += 1
      if (entry.leave?.isLeave) weekly[weekStart].leaveCount += 1

      // Monthly aggregation
      if (!monthly[monthStart]) {
        monthly[monthStart] = { totalHours: 0, totalEarnings: 0, entriesCount: 0, leaveCount: 0 }
      }
      monthly[monthStart].totalHours += entry.totalHours
      monthly[monthStart].totalEarnings += entry.totalEarnings
      monthly[monthStart].entriesCount += 1
      if (entry.leave?.isLeave) monthly[monthStart].leaveCount += 1

      // Project aggregation
      if (entry.project && entry.client && !entry.leave?.isLeave) {
        const key = `${entry.client}-${entry.project}`
        if (!projectMap[key]) {
          projectMap[key] = {
            project: entry.project,
            client: entry.client,
            hours: 0,
            earnings: 0,
          }
        }
        projectMap[key].hours += entry.totalHours
        projectMap[key].earnings += entry.totalEarnings
      }
    })

    return {
      daily,
      weekly,
      monthly,
      projects: Object.values(projectMap),
    }
  }

  const summary = calculateSummary()

  // Prepare chart data
  const chartData = Object.entries(selectedPeriod === "week" ? summary.weekly : summary.monthly)
    .map(([period, data]) => ({
      period:
        selectedPeriod === "week" ? format(parseISO(period), "MMM dd") : format(parseISO(period + "-01"), "MMM yyyy"),
      hours: data.totalHours,
      earnings: data.totalEarnings,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  const projectChartData = summary.projects.map((project) => ({
    name: `${project.client} - ${project.project}`,
    hours: project.hours,
    earnings: project.earnings,
  }))

  // Calculate totals
  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
  const totalEarnings = filteredEntries.reduce((sum, entry) => sum + entry.totalEarnings, 0)
  const totalLeave = filteredEntries.filter((entry) => entry.leave?.isLeave).length
  const totalWorkDays = filteredEntries.filter((entry) => !entry.leave?.isLeave).length

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedPeriod} onValueChange={(value: "week" | "month") => setSelectedPeriod(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client} value={client}>
                {client}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project} value={project}>
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => {
            setSelectedClient("all")
            setSelectedProject("all")
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">{totalWorkDays} work days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${totalWorkDays > 0 ? (totalEarnings / totalWorkDays).toFixed(2) : "0"}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Days</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalLeave}</div>
            <p className="text-xs text-muted-foreground">Days off taken</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.projects.length}</div>
            <p className="text-xs text-muted-foreground">{clients.length} clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours/Earnings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Hours & Earnings Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="hours" fill="#8884d8" name="Hours" />
                <Bar yAxisId="right" dataKey="earnings" fill="#82ca9d" name="Earnings ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Hours by Project</CardTitle>
          </CardHeader>
          <CardContent>
            {projectChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${Number(entry?.hours || 0).toFixed(1)}h`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="hours"
                  >
                    {projectChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No project data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Summary Table */}
      {summary.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.projects.map((project, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{project.project}</div>
                    <div className="text-sm text-muted-foreground">{project.client}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{project.hours.toFixed(2)}h</div>
                    <div className="text-sm text-green-600">${project.earnings.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Increment Impact (after last increment) */}
      {profile?.salaryHistory && profile.salaryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Increment Impact</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const latest = profile.salaryHistory
                .slice()
                .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
                .at(-1)!
              const before = filteredEntries.filter((e) => e.date < latest.effectiveFrom)
              const after = filteredEntries.filter((e) => e.date >= latest.effectiveFrom)
              const beforeHours = before.reduce((s, e) => s + e.totalHours, 0)
              const beforeEarn = before.reduce((s, e) => s + e.totalEarnings, 0)
              const afterHours = after.reduce((s, e) => s + e.totalHours, 0)
              const afterEarn = after.reduce((s, e) => s + e.totalEarnings, 0)
              const pct = beforeEarn > 0 ? (((afterEarn / Math.max(1, afterHours)) - (beforeEarn / Math.max(1, beforeHours))) / (beforeEarn / Math.max(1, beforeHours))) * 100 : 0
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Last Increment</div>
                    <div className="font-medium">{latest.effectiveFrom}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Before</div>
                    <div className="font-medium">{beforeHours.toFixed(1)}h • ${beforeEarn.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">After</div>
                    <div className="font-medium">{afterHours.toFixed(1)}h • ${afterEarn.toFixed(2)}</div>
                    {beforeHours > 0 && afterHours > 0 && (
                      <div className="text-xs text-muted-foreground">Avg/hr change: {pct.toFixed(1)}%</div>
                    )}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
