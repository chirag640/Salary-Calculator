"use client"

import type React from "react"

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
  onSubmit: (entry: Omit<TimeEntry, "_id" | "createdAt" | "updatedAt">) => void
  initialData?: TimeEntry
  isEditing?: boolean
}

export function TimeEntryForm({ selectedDate, onSubmit, initialData, isEditing = false }: TimeEntryFormProps) {
  const [timeIn, setTimeIn] = useState(initialData?.timeIn || "")
  const [timeOut, setTimeOut] = useState(initialData?.timeOut || "")
  const [breakMinutes, setBreakMinutes] = useState(initialData?.breakMinutes || 0)
  const [hourlyRate, setHourlyRate] = useState(initialData?.hourlyRate || 0)
  const [workDescription, setWorkDescription] = useState(initialData?.workDescription || "")
  const [client, setClient] = useState(initialData?.client || "")
  const [project, setProject] = useState(initialData?.project || "")
  const [isLeave, setIsLeave] = useState(initialData?.leave?.isLeave || false)
  const [leaveType, setLeaveType] = useState<LeaveType>(initialData?.leave?.leaveType || "Sick")
  const [leaveReason, setLeaveReason] = useState(initialData?.leave?.leaveReason || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Live calculation
  const calculation =
    timeIn && timeOut && hourlyRate > 0 && !isLeave
      ? calculateTimeWorked(timeIn, timeOut, breakMinutes, hourlyRate)
      : { totalHours: 0, totalEarnings: 0 }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLeave) {
      if (!leaveType) {
        alert("Please select a leave type")
        return
      }
    } else {
      if (!timeIn || !timeOut || hourlyRate <= 0) {
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
        breakMinutes: isLeave ? 0 : breakMinutes,
        hourlyRate: isLeave ? 0 : hourlyRate,
        totalHours: isLeave ? 0 : calculation.totalHours,
        totalEarnings: isLeave ? 0 : calculation.totalEarnings,
        workDescription: isLeave ? leaveReason : workDescription,
        client,
        project,
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
        setBreakMinutes(0)
        setHourlyRate(0)
        setWorkDescription("")
        setClient("")
        setProject("")
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client">Client</Label>
              <Input id="client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" />
            </div>
            <div>
              <Label htmlFor="project">Project</Label>
              <Input
                id="project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Project name"
              />
            </div>
          </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="breakMinutes">Break (minutes)</Label>
                  <Input
                    id="breakMinutes"
                    type="number"
                    min="0"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    placeholder="0.00"
                    required
                  />
                </div>
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
