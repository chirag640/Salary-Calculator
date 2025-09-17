"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Brain, Loader2, FileText } from "lucide-react"

interface AIReportData {
  startDate: string
  endDate: string
  reportType: "summary" | "productivity" | "client-analysis" | "custom"
  customPrompt: string
}

export function AIReportGenerator() {
  const [reportData, setReportData] = useState<AIReportData>({
    startDate: "",
    endDate: "",
    reportType: "summary",
    customPrompt: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [report, setReport] = useState("")

  const handleInputChange = (field: keyof AIReportData, value: string) => {
    setReportData((prev) => ({ ...prev, [field]: value }))
  }

  const generateReport = async () => {
    if (!reportData.startDate || !reportData.endDate) {
      setError("Please select both start and end dates")
      return
    }

    if (reportData.reportType === "custom" && !reportData.customPrompt.trim()) {
      setError("Please provide a custom prompt for the report")
      return
    }

    setLoading(true)
    setError("")
    setReport("")

    try {
      const response = await fetch("/api/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      })

      const data = await response.json()

      if (response.ok) {
        setReport(data.report)
      } else {
        setError(data.error || "Failed to generate AI report")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const reportTypeDescriptions = {
    summary: "Get an overview of your time allocation and work patterns",
    productivity: "Analyze your productivity trends and peak working hours",
    "client-analysis": "Understand time distribution across different clients and projects",
    custom: "Ask AI anything specific about your work logs",
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Report Generator
          </CardTitle>
          <CardDescription>Generate intelligent insights from your work logs using AI analysis</CardDescription>
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
                value={reportData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={reportData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select value={reportData.reportType} onValueChange={(value) => handleInputChange("reportType", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Work Summary</SelectItem>
                <SelectItem value="productivity">Productivity Analysis</SelectItem>
                <SelectItem value="client-analysis">Client & Project Analysis</SelectItem>
                <SelectItem value="custom">Custom Analysis</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">{reportTypeDescriptions[reportData.reportType]}</p>
          </div>

          {reportData.reportType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customPrompt">Custom Prompt</Label>
              <Textarea
                id="customPrompt"
                placeholder="What would you like to know about your work logs? e.g., 'What are my most productive days?' or 'How much time do I spend on different types of tasks?'"
                value={reportData.customPrompt}
                onChange={(e) => handleInputChange("customPrompt", e.target.value)}
                rows={3}
              />
            </div>
          )}

          <Button onClick={generateReport} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating AI Report...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate AI Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              AI Analysis Report
            </CardTitle>
            <CardDescription>
              Generated for {reportData.startDate} to {reportData.endDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border">{report}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
