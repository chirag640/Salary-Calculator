import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import type { TimeEntry } from "@/lib/types"
import PDFDocument from "pdfkit"
import { verifyToken, verifyRevealToken } from "@/lib/auth"
import { getEffectiveHourlyRateForDate, computeEarningsWithOvertime } from "@/lib/salary"
import { invoiceRequestSchema } from "@/lib/validation/schemas"
import { validateCsrf } from "@/lib/csrf"
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit"

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

interface InvoiceRequest {
  startDate: string
  endDate: string
  clientName?: string
  projectName?: string
  invoiceNumber: string
  notes?: string
  breakdown: "daily" | "client" | "none"
}

export async function POST(request: NextRequest) {
  try {
  const cookieToken = request.cookies.get("auth-token")?.value
  const userFromToken = cookieToken ? verifyToken(cookieToken) : null
  const userId = userFromToken?._id
  const userEmail = userFromToken?.email

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Require a valid reveal token to include monetary amounts in the invoice
    const revealCookie = request.cookies.get("reveal-token")?.value
    const revealValid = revealCookie ? verifyRevealToken(revealCookie) : null
    if (!revealValid || revealValid.userId !== userId) {
      return NextResponse.json({ error: "Reveal required to generate invoice. Please reveal sensitive values first." }, { status: 403 })
    }

    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const rl = rateLimit(buildRateLimitKey(ip, "invoice"), { windowMs: 60_000, max: 3 })
    if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })

    const raw = await request.json()
    const parsed = invoiceRequestSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.format() }, { status: 400 })
    }
    const { startDate, endDate, clientName, projectName, invoiceNumber, notes, breakdown } = parsed.data

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
    }

  const { db } = await connectToDatabase()
  const collection = db.collection<TimeEntry>("timeEntries")

    // Build query
    const query: any = {
      userId,
      date: { $gte: startDate, $lte: endDate },
      "leave.isLeave": { $ne: true }, // Exclude leave days
    }

    if (clientName) {
      query.client = new RegExp(escapeRegex(clientName), "i")
    }
    if (projectName) {
      query.project = new RegExp(escapeRegex(projectName), "i")
    }

  const entries = await collection.find(query).sort({ date: 1 }).toArray()

    if (entries.length === 0) {
      return NextResponse.json({ error: "No time entries found for the specified criteria" }, { status: 404 })
    }

    // Calculate totals
    const totalHours = entries.reduce((sum, entry) => sum + entry.totalHours, 0)
    // Recompute earnings in case overtime rules changed using same db instance
    let totalEarnings = 0
    for (const e of entries) {
      const eff = await getEffectiveHourlyRateForDate(db, userId, e.date)
      totalEarnings += computeEarningsWithOvertime(e.totalHours, eff.hourlyRate, eff.overtime)
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

    // Header
    doc.fontSize(24).text("INVOICE", 50, 50)
    doc.fontSize(12).text(`Invoice #: ${invoiceNumber}`, 400, 50)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 70)
    doc.text(`Period: ${startDate} to ${endDate}`, 400, 90)

    // From section
    doc.fontSize(14).text("From:", 50, 130)
    doc.fontSize(12).text(userEmail || "Time Tracker User", 50, 150)

    // Summary
    doc.fontSize(14).text("Summary", 50, 200)
    doc.fontSize(12)
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, 50, 220)
    doc.text(`Total Amount: $${totalEarnings.toFixed(2)}`, 50, 240)

    let yPosition = 280

    // Breakdown
    if (breakdown === "daily") {
      doc.fontSize(14).text("Daily Breakdown", 50, yPosition)
      yPosition += 30

      entries.forEach((entry) => {
        if (yPosition > 700) {
          doc.addPage()
          yPosition = 50
        }

        doc.fontSize(10)
        doc.text(`${entry.date}`, 50, yPosition)
        doc.text(`${entry.timeIn} - ${entry.timeOut}`, 150, yPosition)
        doc.text(`${entry.totalHours.toFixed(2)}h`, 250, yPosition)
        doc.text(`$${entry.totalEarnings.toFixed(2)}`, 300, yPosition)

        if (entry.client || entry.project) {
          doc.text(`${entry.client || ""} ${entry.project || ""}`, 350, yPosition)
        }

        if (entry.workDescription) {
          yPosition += 15
          doc.fontSize(8).text(entry.workDescription, 70, yPosition, { width: 400 })
        }

        yPosition += 25
      })
    } else if (breakdown === "client") {
      doc.fontSize(14).text("Client Breakdown", 50, yPosition)
      yPosition += 30

      const clientSummary = entries.reduce(
        (acc, entry) => {
          const key = `${entry.client || "No Client"} - ${entry.project || "No Project"}`
          if (!acc[key]) {
            acc[key] = { hours: 0, earnings: 0 }
          }
          acc[key].hours += entry.totalHours
          acc[key].earnings += entry.totalEarnings
          return acc
        },
        {} as Record<string, { hours: number; earnings: number }>,
      )

      Object.entries(clientSummary).forEach(([key, summary]) => {
        doc.fontSize(10)
        doc.text(key, 50, yPosition)
        doc.text(`${summary.hours.toFixed(2)}h`, 250, yPosition)
        doc.text(`$${summary.earnings.toFixed(2)}`, 300, yPosition)
        yPosition += 20
      })
    }

    // Notes
    if (notes) {
      yPosition += 30
      doc.fontSize(14).text("Notes", 50, yPosition)
      yPosition += 20
      doc.fontSize(10).text(notes, 50, yPosition, { width: 500 })
    }

    doc.end()

    return new Promise<Response>((resolve) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(
          new Response(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="invoice-${invoiceNumber}.pdf"`,
            },
          }),
        )
      })
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 })
  }
}
