"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, FileText } from "lucide-react"

interface InvoiceData {
  startDate: string
  endDate: string
  clientName: string
  projectName: string
  invoiceNumber: string
  notes: string
  breakdown: "daily" | "client" | "none"
}

export function InvoiceGenerator() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    startDate: "",
    endDate: "",
    clientName: "",
    projectName: "",
    invoiceNumber: `INV-${Date.now()}`,
    notes: "",
    breakdown: "daily",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleInputChange = (field: keyof InvoiceData, value: string) => {
    setInvoiceData((prev) => ({ ...prev, [field]: value }))
  }

  const generateInvoice = async () => {
    if (!invoiceData.startDate || !invoiceData.endDate) {
      setError("Please select both start and end dates")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/invoice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `invoice-${invoiceData.invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to generate invoice")
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
          <FileText className="h-5 w-5" />
          Invoice Generator
        </CardTitle>
        <CardDescription>Generate professional invoices for any date range</CardDescription>
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
              value={invoiceData.startDate}
              onChange={(e) => handleInputChange("startDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={invoiceData.endDate}
              onChange={(e) => handleInputChange("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name (Optional)</Label>
            <Input
              id="clientName"
              placeholder="Filter by client"
              value={invoiceData.clientName}
              onChange={(e) => handleInputChange("clientName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name (Optional)</Label>
            <Input
              id="projectName"
              placeholder="Filter by project"
              value={invoiceData.projectName}
              onChange={(e) => handleInputChange("projectName", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            id="invoiceNumber"
            value={invoiceData.invoiceNumber}
            onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="breakdown">Breakdown Type</Label>
          <Select value={invoiceData.breakdown} onValueChange={(value) => handleInputChange("breakdown", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Breakdown</SelectItem>
              <SelectItem value="client">Client Breakdown</SelectItem>
              <SelectItem value="none">Summary Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Payment terms, additional information..."
            value={invoiceData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            rows={3}
          />
        </div>

        <Button onClick={generateInvoice} disabled={loading} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          {loading ? "Generating Invoice..." : "Generate & Download PDF"}
        </Button>
      </CardContent>
    </Card>
  )
}
