"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, FileSpreadsheet } from "lucide-react"

interface ExportData {
  startDate: string
  endDate: string
  format: "csv" | "xlsx"
  includeLeave: boolean
  clientFilter: string
  projectFilter: string
}

export function ExportManager() {
  const [exportData, setExportData] = useState<ExportData>({
    startDate: "",
    endDate: "",
    format: "csv",
    includeLeave: true,
    clientFilter: "",
    projectFilter: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  // Helper to read a cookie value client-side
  function readCookie(name: string): string | null {
    const match = document.cookie.split(/; */).find((c) => c.startsWith(name + "="))
    return match ? decodeURIComponent(match.split("=")[1]) : null
  }

  const ensureCsrfToken = useCallback(async () => {
    // Try cookie first
    const existing = readCookie("csrf-token")
    if (existing) {
      setCsrfToken(existing)
      return existing
    }
    try {
      const res = await fetch("/api/csrf", { method: "GET", cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setCsrfToken(data.csrfToken)
        return data.csrfToken as string
      }
    } catch {
      /* noop */
    }
    return null
  }, [])

  useEffect(() => {
    // Preload a CSRF token on mount
    ensureCsrfToken()
  }, [ensureCsrfToken])

  const handleInputChange = (field: keyof ExportData, value: string | boolean) => {
    setExportData((prev) => ({ ...prev, [field]: value }))
  }

  const exportData_func = async () => {
    if (!exportData.startDate || !exportData.endDate) {
      setError("Please select both start and end dates")
      return
    }

    setLoading(true)
    setError("")

    try {
      const token = csrfToken || (await ensureCsrfToken())
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        body: JSON.stringify(exportData),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url

        const filename = `time-entries-${exportData.startDate}-to-${exportData.endDate}.${exportData.format}`
        a.download = filename

        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else if (response.status === 403) {
        // Attempt one silent retry if CSRF failed (maybe token rotated)
        const refreshed = await ensureCsrfToken()
        if (refreshed) {
          const retry = await fetch("/api/export", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": refreshed,
            },
            body: JSON.stringify(exportData),
          })
          if (retry.ok) {
            const blob = await retry.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            const filename = `time-entries-${exportData.startDate}-to-${exportData.endDate}.${exportData.format}`
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
          } else {
            const errData = await retry.json().catch(() => ({}))
            setError(errData.error || "Failed to export data (after retry)")
          }
        } else {
          setError("Security token missing. Refresh the page and try again.")
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || "Failed to export data")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>Export your time entries as CSV or Excel files</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={exportData.startDate}
              onChange={(e) => handleInputChange("startDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={exportData.endDate}
              onChange={(e) => handleInputChange("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="format">Export Format</Label>
          <Select value={exportData.format} onValueChange={(value) => handleInputChange("format", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
              <SelectItem value="xlsx">XLSX (Excel Spreadsheet)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientFilter">Client Filter (Optional)</Label>
            <Input
              id="clientFilter"
              placeholder="Filter by client name"
              value={exportData.clientFilter}
              onChange={(e) => handleInputChange("clientFilter", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectFilter">Project Filter (Optional)</Label>
            <Input
              id="projectFilter"
              placeholder="Filter by project name"
              value={exportData.projectFilter}
              onChange={(e) => handleInputChange("projectFilter", e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="includeLeave"
            checked={exportData.includeLeave}
            onChange={(e) => handleInputChange("includeLeave", e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="includeLeave">Include leave days in export</Label>
        </div>

        <Button onClick={exportData_func} disabled={loading} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          {loading ? "Exporting..." : `Export as ${exportData.format.toUpperCase()}`}
        </Button>
      </CardContent>
    </Card>
  )
}
