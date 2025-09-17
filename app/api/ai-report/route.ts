import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { connectToDatabase } from "@/lib/mongodb"
import type { TimeEntry } from "@/lib/types"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { verifyToken } from "@/lib/auth"

interface AIReportRequest {
  startDate: string
  endDate: string
  reportType: "summary" | "productivity" | "client-analysis" | "custom"
  customPrompt?: string
}

export async function POST(request: NextRequest) {
  try {
  const cookieToken = request.cookies.get("auth-token")?.value
  const userFromToken = cookieToken ? verifyToken(cookieToken) : null
  const userId = userFromToken?._id || request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reportData: AIReportRequest = await request.json()
    const { startDate, endDate, reportType, customPrompt } = reportData

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection<TimeEntry>("timeEntries")

    // Fetch entries for the date range
    const entries = await collection
      .find({
        userId,
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1 })
      .toArray()

    if (entries.length === 0) {
      return NextResponse.json({ error: "No entries found for the specified date range" }, { status: 404 })
    }

    // Prepare data for AI analysis
    const workData = entries.map((entry) => ({
      date: entry.date,
      timeIn: entry.timeIn,
      timeOut: entry.timeOut,
      totalHours: entry.totalHours,
      totalEarnings: entry.totalEarnings,
      client: entry.client || "No Client",
      project: entry.project || "No Project",
      workDescription: entry.workDescription || "No description",
      isLeave: entry.leave?.isLeave || false,
      leaveType: entry.leave?.leaveType || null,
    }))

    // Calculate summary statistics
    const totalHours = workData.reduce((sum, entry) => sum + entry.totalHours, 0)
    const totalEarnings = workData.reduce((sum, entry) => sum + entry.totalEarnings, 0)
    const workDays = workData.filter((entry) => !entry.isLeave).length
    const leaveDays = workData.filter((entry) => entry.isLeave).length

    // Generate appropriate prompt based on report type
    let prompt = ""

    switch (reportType) {
      case "summary":
        prompt = `Analyze this work log data and provide a comprehensive summary including:
        - Overall time allocation and patterns
        - Most productive periods
        - Work-life balance insights
        - Key achievements and focus areas
        
        Data: ${JSON.stringify({ workData, totalHours, totalEarnings, workDays, leaveDays }, null, 2)}`
        break

      case "productivity":
        prompt = `Analyze this work log data for productivity insights including:
        - Peak productivity hours and days
        - Time management patterns
        - Efficiency trends
        - Recommendations for improvement
        
        Data: ${JSON.stringify({ workData, totalHours, totalEarnings, workDays }, null, 2)}`
        break

      case "client-analysis":
        prompt = `Analyze this work log data for client and project insights including:
        - Time distribution across clients and projects
        - Most profitable clients/projects
        - Resource allocation patterns
        - Business development opportunities
        
        Data: ${JSON.stringify({ workData, totalHours, totalEarnings }, null, 2)}`
        break

      case "custom":
        prompt = `${customPrompt}
        
        Based on this work log data: ${JSON.stringify({ workData, totalHours, totalEarnings, workDays, leaveDays }, null, 2)}`
        break
    }

    // Generate AI report using OpenAI
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxOutputTokens: 1000,
    })

    return NextResponse.json({ report: text })
  } catch (error) {
    console.error("Error generating AI report:", error)
    return NextResponse.json(
      { error: "Failed to generate AI report. Please check your OpenAI API configuration." },
      { status: 500 },
    )
  }
}
