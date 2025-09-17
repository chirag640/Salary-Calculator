"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { calculateTimeWorked, formatTime, formatCurrency } from "@/lib/time-utils"
import type { TimeEntry, LeaveType } from "@/lib/types"

interface TimeEntryFormProps {
  selectedDate: string
  onSubmit: (entry: Omit<TimeEntry, "_id" | "createdAt" | "updatedAt" | "userId">) => void
  initialData?: TimeEntry
  isEditing?: boolean
}

export function TimeEntryForm({ selectedDate, onSubmit, initialData, isEditing = false }: TimeEntryFormProps) {
  const [timeIn, setTimeIn] = useState(initialData?.timeIn || "")
  const [timeOut, setTimeOut] = useState(initialData?.timeOut || "")
  const [manualHours, setManualHours] = useState<number>(initialData?.totalHours || 0)
  const [breakMinutes] = useState(0)
  const [hourlyRate, setHourlyRate] = useState<number>(initialData?.hourlyRate || 0)
  const [workDescription, setWorkDescription] = useState(initialData?.workDescription || "")
  const [client] = useState("")
  const [project] = useState("")
  const [isLeave, setIsLeave] = useState(initialData?.leave?.isLeave || false)
  const [leaveType, setLeaveType] = useState<LeaveType>(initialData?.leave?.leaveType || "Sick")
  const [leaveReason, setLeaveReason] = useState(initialData?.leave?.leaveReason || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Live calculation
  const calculation = (() => {
    if (isLeave || hourlyRate <= 0) return { totalHours: 0, totalEarnings: 0 }
    if (timeIn && timeOut) return calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate)
    if (manualHours > 0) {
      const h = Math.round(manualHours * 100) / 100
      return { totalHours: h, totalEarnings: Math.round(h * hourlyRate * 100) / 100 }
    }
    return { totalHours: 0, totalEarnings: 0 }
  })()

  // Fetch hourly rate for selected date on mount or when date changes
  React.useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(`/api/profile/hourly-rate?date=${selectedDate}`)
        if (res.ok) {
          const data = await res.json()
          setHourlyRate(data.hourlyRate || 0)
        }
      } catch {}
    }
    if (!isLeave) fetchRate()
  }, [selectedDate, isLeave])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLeave) {
      if (!leaveType) {
        alert("Please select a leave type")
        return
      }
    } else {
      if ((!(timeIn && timeOut) && manualHours <= 0) || hourlyRate <= 0) {
        alert("Please fill in all required fields")
        return
      }
    }

    setIsSubmitting(true)

    try {
      const entryData = {
        date: selectedDate,
  timeIn: isLeave ? "" : timeIn,
  timeOut: isLeave ? "" : timeOut,
  totalHours: isLeave ? 0 : calculation.totalHours,
        breakMinutes: isLeave ? 0 : 0,
        hourlyRate: isLeave ? 0 : hourlyRate,
        totalEarnings: isLeave ? 0 : calculation.totalEarnings,
        workDescription: isLeave ? leaveReason : workDescription,
        client: "",
        project: "",
        leave: isLeave
          ? {
              isLeave: true,
              leaveType,
              leaveReason,
            }
          : undefined,
      }

      await onSubmit(entryData)

      // Reset form if not editing
      if (!isEditing) {
        setTimeIn("")
  setTimeOut("")
  setManualHours(0)
        setHourlyRate((prev) => prev)
        setWorkDescription("")
        setIsLeave(false)
        setLeaveType("Sick")
        setLeaveReason("")
      }
    } catch (error) {
      console.error("Error submitting time entry:", error)
      alert("Failed to save time entry")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Entry" : "Log Entry"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="isLeave" checked={isLeave} onCheckedChange={(checked) => setIsLeave(checked as boolean)} />
            <Label htmlFor="isLeave">This is a leave day</Label>
          </div>

          {/* Client and Project fields removed per requirements */}

          {isLeave ? (
            <>
              <div>
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select value={leaveType} onValueChange={(value) => setLeaveType(value as LeaveType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sick">Sick Leave</SelectItem>
                    <SelectItem value="Vacation">Vacation</SelectItem>
                    <SelectItem value="Personal">Personal Leave</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="leaveReason">Reason (Optional)</Label>
                <Textarea
                  id="leaveReason"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Optional reason for leave"
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeIn">Time In</Label>
                  <Input id="timeIn" type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="timeOut">Time Out</Label>
                  <Input
                    id="timeOut"
                    type="time"
                    value={timeOut}
                    onChange={(e) => setTimeOut(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Break and manual hourly rate removed; hourly rate auto-fetched from profile */}
              <div>
                <Label>Hourly Rate (auto)</Label>
                <div className="p-2 rounded bg-muted">${hourlyRate.toFixed(2)} / hr</div>
              </div>

              <div>
                <Label htmlFor="workDescription">Work Description</Label>
                <Textarea
                  id="workDescription"
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="What did you work on today?"
                  rows={3}
                />
              </div>

              {/* Live calculation display */}
              {calculation.totalHours > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Hours:</span>
                      <div className="text-lg font-bold text-primary">{formatTime(calculation.totalHours)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Total Earnings:</span>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(calculation.totalEarnings)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : isEditing ? "Update Entry" : "Save Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
