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
  const [isHolidayWork, setIsHolidayWork] = useState<boolean>(initialData?.isHolidayWork || false)
  const [holidayCategory, setHolidayCategory] = useState<"sunday" | "saturday" | "other">(initialData?.holidayCategory || 'sunday')
  const [isHolidayExtra, setIsHolidayExtra] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Keep form state in sync when switching between entries to edit or exiting edit mode
  React.useEffect(() => {
    if (initialData && isEditing) {
      setTimeIn(initialData.timeIn || "")
      setTimeOut(initialData.timeOut || "")
  setManualHours(initialData.totalHours || 0)
      setHourlyRate(initialData.hourlyRate || 0)
      setWorkDescription(initialData.workDescription || "")
      setIsLeave(initialData.leave?.isLeave || false)
      setLeaveType(initialData.leave?.leaveType || "Sick")
      setLeaveReason(initialData.leave?.leaveReason || "")
    } else if (!isEditing) {
      // Reset to defaults when not editing
    setTimeIn("")
    setTimeOut("")
    setManualHours(0)
    setIsHolidayExtra(false)
      setWorkDescription("")
      setIsLeave(false)
      setLeaveType("Sick")
  setLeaveReason("")
  setIsHolidayWork(false)
      // Hourly rate will be fetched by the effect below
    }
  }, [initialData, isEditing])

  // Live calculation
  const calculation = (() => {
    if (isLeave || hourlyRate <= 0) return { totalHours: 0, totalEarnings: 0 }
    const baseHolidayHours = 9
    if (isHolidayWork) {
      if (isHolidayExtra && timeIn && timeOut) {
        const extraCalc = calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate).totalHours
        const total = Math.round((baseHolidayHours + extraCalc) * 100) / 100
        const earnings = Math.round(total * hourlyRate * 100) / 100
        return { totalHours: total, totalEarnings: earnings }
      } else {
        const total = baseHolidayHours
        const earnings = Math.round(total * hourlyRate * 100) / 100
        return { totalHours: total, totalEarnings: earnings }
      }
    }
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
      // Holiday work: times/manual hours optional (base 9h applies). Still require hourlyRate.
      if (isHolidayWork) {
        if (hourlyRate <= 0) {
          alert("Hourly rate not available for selected date")
          return
        }
        if (isHolidayExtra && !(timeIn && timeOut)) {
          alert("Provide a time range for extra holiday hours or uncheck 'Add extra hours'.")
          return
        }
      } else {
        if ((!(timeIn && timeOut) && manualHours <= 0) || hourlyRate <= 0) {
          alert("Please fill in all required fields")
          return
        }
      }
    }

    setIsSubmitting(true)

    try {
      const entryData = {
        date: selectedDate,
    timeIn: isLeave ? "" : (isHolidayWork && !isHolidayExtra ? "" : timeIn),
    timeOut: isLeave ? "" : (isHolidayWork && !isHolidayExtra ? "" : timeOut),
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
        isHolidayWork: isHolidayWork || undefined,
        holidayCategory: isHolidayWork ? holidayCategory : undefined,
    isHolidayExtra: isHolidayWork ? (isHolidayExtra || undefined) : undefined,
  // no separate extra hours field; extra derived from time range when isHolidayExtra
      }

      await onSubmit(entryData)

      // Reset form if not editing
      if (!isEditing) {
    setTimeIn("")
    setTimeOut("")
    setManualHours(0)
    setIsHolidayExtra(false)
        setHourlyRate((prev) => prev)
        setWorkDescription("")
        setIsLeave(false)
        setLeaveType("Sick")
    setLeaveReason("")
    setIsHolidayWork(false)
      }
    } catch (error) {
      console.error("Error submitting time entry:", error)
      alert("Failed to save time entry")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
  <Card className="hover:translate-y-[-1px] transition-transform">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Entry" : "Log Entry"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="isLeave" checked={isLeave} onCheckedChange={(checked) => { setIsLeave(!!checked); if (checked) { setIsHolidayWork(false) } }} />
              <Label htmlFor="isLeave">This is a leave day</Label>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="isHolidayWork" checked={isHolidayWork} onCheckedChange={(checked) => {
                  const val = !!checked
                  setIsHolidayWork(val)
                  if (val) {
                    setIsLeave(false)
                  } else {
                    setIsHolidayExtra(false)
                    setTimeIn("")
                    setTimeOut("")
                  }
                }} />
                <Label htmlFor="isHolidayWork">Holiday / weekend work (base 9h)</Label>
                {isHolidayWork && (
                  <div className="flex items-center gap-2">
                    <Select value={holidayCategory} onValueChange={(v) => setHolidayCategory(v as any)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="other">Other Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {isHolidayWork && (
                <div className="flex items-center gap-3 pl-6">
                  <Checkbox id="isHolidayExtra" checked={isHolidayExtra} onCheckedChange={(c) => {
                    const val = !!c
                    setIsHolidayExtra(val)
                    if (!val) { setTimeIn(""); setTimeOut("") }
                  }} />
                  <Label htmlFor="isHolidayExtra">Add extra hours via time range</Label>
                </div>
              )}
              {isHolidayWork && !isHolidayExtra && (
                <div className="text-xs text-muted-foreground pl-6">Leave time fields empty to log only the base paid 9 hours.</div>
              )}
              {isHolidayWork && isHolidayExtra && (
                <div className="text-xs text-muted-foreground pl-6">Enter Time In / Time Out for extra hours above the base 9.</div>
              )}
            </div>
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
              {!isHolidayWork && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeIn">Time In</Label>
                    <Input id="timeIn" type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="timeOut">Time Out</Label>
                    <Input id="timeOut" type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} required />
                  </div>
                </div>
              )}
              {isHolidayWork && isHolidayExtra && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeIn">Time In (extra)</Label>
                    <Input id="holidayTimeIn" type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} required={isHolidayExtra} />
                  </div>
                  <div>
                    <Label htmlFor="timeOut">Time Out (extra)</Label>
                    <Input id="holidayTimeOut" type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} required={isHolidayExtra} />
                  </div>
                </div>
              )}

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

          <Button type="submit" disabled={isSubmitting} className="w-full" variant="glass">
            {isSubmitting ? "Saving..." : isEditing ? "Update Entry" : "Save Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
