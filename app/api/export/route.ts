import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import type { TimeEntry } from "@/lib/types"
import * as XLSX from "xlsx"
import { verifyToken } from "@/lib/auth"

interface ExportRequest {
  startDate: string
  endDate: string
  format: "csv" | "xlsx"
  includeLeave: boolean
  clientFilter?: string
  projectFilter?: string
}

export async function POST(request: NextRequest) {
  try {
  const cookieToken = request.cookies.get("auth-token")?.value
  const userFromToken = cookieToken ? verifyToken(cookieToken) : null
  const userId = userFromToken?._id || request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const exportData: ExportRequest = await request.json()
    const { startDate, endDate, format, includeLeave, clientFilter, projectFilter } = exportData

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

    // Build query
    const query: any = {
      userId,
      date: { $gte: startDate, $lte: endDate },
    }

    if (!includeLeave) {
      query["leave.isLeave"] = { $ne: true }
    }

    if (clientFilter) {
      query.client = new RegExp(clientFilter, "i")
    }
    if (projectFilter) {
      query.project = new RegExp(projectFilter, "i")
    }

    const entries = await collection.find(query).sort({ date: 1 }).toArray()

    if (entries.length === 0) {
      return NextResponse.json({ error: "No entries found for the specified criteria" }, { status: 404 })
    }

    // Prepare data for export
    const exportRows = entries.map((entry) => ({
      Date: entry.date,
      "Time In": entry.timeIn || "N/A",
      "Time Out": entry.timeOut || "N/A",
      "Break Minutes": entry.breakMinutes,
      "Total Hours": entry.totalHours,
      "Hourly Rate": entry.hourlyRate,
      "Total Earnings": entry.totalEarnings,
      Client: entry.client || "",
      Project: entry.project || "",
      "Work Description": entry.workDescription || "",
      "Is Leave": entry.leave?.isLeave ? "Yes" : "No",
      "Leave Type": entry.leave?.leaveType || "",
      "Leave Reason": entry.leave?.leaveReason || "",
    }))

    if (format === "csv") {
      // Generate CSV (robust escaping, BOM for Excel, CRLF line endings)
      const headers = Object.keys(exportRows[0])

      const csvEscape = (val: any) => {
        if (val === null || val === undefined) return ""
        // Format numeric columns to 2 decimals for consistency
        if (typeof val === "number") return val.toFixed(2)
        let s = String(val)
        // Escape double quotes by doubling them
        if (s.includes('"')) s = s.replace(/"/g, '""')
        // If value contains comma, newline, or leading/trailing spaces, wrap in quotes
        if (s.includes(",") || s.includes("\n") || s.includes("\r") || /^\s|\s$/.test(s)) {
          return `"${s}"`
        }
        return s
      }

      const rows = [
        headers.join(","),
        ...exportRows.map((row) => headers.map((h) => csvEscape(row[h as keyof typeof row])).join(",")),
      ].join("\r\n")

      // Prepend UTF-8 BOM to improve Excel compatibility on Windows
      const csvContent = "\uFEFF" + rows

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="time-entries-${startDate}-to-${endDate}.csv"`,
        },
      })
    } else {
      // Generate XLSX
      const worksheet = XLSX.utils.json_to_sheet(exportRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Time Entries")

      // Auto-size columns
      const colWidths = Object.keys(exportRows[0]).map((key) => ({
        wch: Math.max(key.length, 15),
      }))
      worksheet["!cols"] = colWidths

      const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

      return new Response(xlsxBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="time-entries-${startDate}-to-${endDate}.xlsx"`,
        },
      })
    }
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
  }
}
