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
import { TimerControls } from "@/components/timer-controls"

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

    // Determine whether time inputs should be required
    const timesRequired = !isLeave && !isHolidayWork && manualHours <= 0

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

  // Live calculation: compute hours regardless of whether hourlyRate is available.
  // Earnings depend on hourlyRate; if hourlyRate is 0 we'll show 0 earnings but still
  // allow the user to save the entry (useful for prior dates where rate may not be set).
  const calculation = (() => {
    if (isLeave) return { totalHours: 0, totalEarnings: 0 }
    const baseHolidayHours = 9
    if (isHolidayWork) {
      if (isHolidayExtra && timeIn && timeOut) {
        const extraCalc = calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate).totalHours
        const total = Math.round((baseHolidayHours + extraCalc) * 100) / 100
        const earnings = hourlyRate > 0 ? Math.round(total * hourlyRate * 100) / 100 : 0
        return { totalHours: total, totalEarnings: earnings }
      } else {
        const total = baseHolidayHours
        const earnings = hourlyRate > 0 ? Math.round(total * hourlyRate * 100) / 100 : 0
        return { totalHours: total, totalEarnings: earnings }
      }
    }

    if (timeIn && timeOut) {
      // calculateTimeWorked will compute totalHours; earnings use hourlyRate (may be 0)
      const calc = calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate)
      // If hourlyRate === 0, calculateTimeWorked will produce 0 earnings; keep hours
      return { totalHours: calc.totalHours, totalEarnings: calc.totalEarnings }
    }

    if (manualHours > 0) {
      const h = Math.round(manualHours * 100) / 100
      const earnings = hourlyRate > 0 ? Math.round(h * hourlyRate * 100) / 100 : 0
      return { totalHours: h, totalEarnings: earnings }
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
        if ((!(timeIn && timeOut) && manualHours <= 0)) {
          alert("Please fill in all required fields (provide a time range or manual hours)")
          return
        }
        // If hourly rate is missing for the selected date, warn but allow saving.
        if (hourlyRate <= 0) {
          const ok = typeof window !== 'undefined' ? window.confirm('Hourly rate is not set for the selected date. Total earnings will be recorded as $0. Do you want to continue?') : true
          if (!ok) return
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
    <div className="space-y-4">
  <Card className="hover:translate-y-[-1px] transition-transform">
      <CardHeader>
        <CardTitle className="text-2xl">{isEditing ? "✏️ Edit Entry" : "📝 Manual Log Entry"}</CardTitle>
        {!isEditing && (
          <p className="text-sm text-muted-foreground mt-2">
            Manually log your work hours with specific times. Use Quick Start Timer above for real-time tracking.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Entry Type Selection */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-sm">Entry Type</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isLeave" 
                  checked={isLeave} 
                  onCheckedChange={(checked) => { 
                    setIsLeave(!!checked); 
                    if (checked) { setIsHolidayWork(false) } 
                  }} 
                />
                <Label htmlFor="isLeave" className="cursor-pointer">
                  🏖️ This is a leave/off day
                </Label>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isHolidayWork" 
                    checked={isHolidayWork} 
                    onCheckedChange={(checked) => {
                      const val = !!checked
                      setIsHolidayWork(val)
                      if (val) {
                        setIsLeave(false)
                      } else {
                        setIsHolidayExtra(false)
                        setTimeIn("")
                        setTimeOut("")
                      }
                    }} 
                  />
                  <Label htmlFor="isHolidayWork" className="cursor-pointer">
                    🎉 Holiday/weekend work (automatic 9h base pay)
                  </Label>
                </div>
                
                {isHolidayWork && (
                  <div className="ml-6 space-y-2">
                    <Select value={holidayCategory} onValueChange={(v) => setHolidayCategory(v as any)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="other">Other Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isHolidayExtra" 
                        checked={isHolidayExtra} 
                        onCheckedChange={(c) => {
                          const val = !!c
                          setIsHolidayExtra(val)
                          if (!val) { setTimeIn(""); setTimeOut("") }
                        }} 
                      />
                      <Label htmlFor="isHolidayExtra" className="text-sm cursor-pointer">
                        Add extra hours beyond base 9h
                      </Label>
                    </div>
                    
                    {!isHolidayExtra && (
                      <p className="text-xs text-muted-foreground">
                        💡 You'll automatically get paid for 9 hours
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isLeave ? (
            <>
              <div>
                <Label htmlFor="leaveType" className="text-base">Leave Type</Label>
                <Select value={leaveType} onValueChange={(value) => setLeaveType(value as LeaveType)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sick">🤒 Sick Leave</SelectItem>
                    <SelectItem value="Vacation">🏖️ Vacation</SelectItem>
                    <SelectItem value="Personal">👤 Personal Leave</SelectItem>
                    <SelectItem value="Holiday">🎉 Holiday</SelectItem>
                    <SelectItem value="Other">📋 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="leaveReason" className="text-base">Reason (Optional)</Label>
                <Textarea
                  id="leaveReason"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Optional reason for leave"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </>
          ) : (
            <>
              {/* Time Entry Fields */}
              {!isHolidayWork && (
                <div>
                  <Label className="text-base mb-2 block">⏰ Work Hours</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timeIn" className="text-sm text-muted-foreground">Start Time</Label>
                      <Input 
                        id="timeIn" 
                        type="time" 
                        value={timeIn} 
                        onChange={(e) => setTimeIn(e.target.value)} 
                        required={timesRequired}
                        className="h-12 text-lg"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeOut" className="text-sm text-muted-foreground">End Time</Label>
                      <Input 
                        id="timeOut" 
                        type="time" 
                        value={timeOut} 
                        onChange={(e) => setTimeOut(e.target.value)} 
                        required={timesRequired}
                        className="h-12 text-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {isHolidayWork && isHolidayExtra && (
                <div>
                  <Label className="text-base mb-2 block">⏰ Extra Hours (beyond base 9h)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="holidayTimeIn" className="text-sm text-muted-foreground">Start Time</Label>
                      <Input 
                        id="holidayTimeIn" 
                        type="time" 
                        value={timeIn} 
                        onChange={(e) => setTimeIn(e.target.value)} 
                        required={isHolidayExtra} 
                        className="h-12 text-lg"
                      />
                    </div>
                    <div>
                      <Label htmlFor="holidayTimeOut" className="text-sm text-muted-foreground">End Time</Label>
                      <Input 
                        id="holidayTimeOut" 
                        type="time" 
                        value={timeOut} 
                        onChange={(e) => setTimeOut(e.target.value)} 
                        required={isHolidayExtra} 
                        className="h-12 text-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hourly Rate Display */}
              <div>
                <Label className="text-base">💰 Hourly Rate</Label>
                <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    ${hourlyRate.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">per hour</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically loaded from your profile
                  </p>
                </div>
              </div>

              {/* Work Description */}
              <div>
                <Label htmlFor="workDescription" className="text-base">📝 What did you work on?</Label>
                <Textarea
                  id="workDescription"
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Describe your work for today..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Live calculation display (always shown so user can verify values for past dates) */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Summary</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total Hours</div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {calculation.totalHours.toFixed ? calculation.totalHours.toFixed(2) : calculation.totalHours}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Estimated Earnings</div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-300">
                      ${calculation.totalEarnings.toFixed ? calculation.totalEarnings.toFixed(2) : calculation.totalEarnings}
                    </div>
                  </div>
                </div>
                {calculation.totalHours === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">No hours computed yet — ensure start and end times are filled or enter manual hours.</p>
                )}
              </div>
            </>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg" variant="glass">
            {isSubmitting ? "💾 Saving..." : isEditing ? "✅ Update Entry" : "💾 Save Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  )
}
