"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTime, formatCurrency } from "@/lib/time-utils"
import type { TimeEntry } from "@/lib/types"
import { Pencil, Trash2, Calendar } from "lucide-react"

interface TimeEntryListProps {
  entries: TimeEntry[]
  onEdit: (entry: TimeEntry) => void
  onDelete: (id: string) => void
}

export function TimeEntryList({ entries, onEdit, onDelete }: TimeEntryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) {
      return
    }

    setDeletingId(id)
    try {
      await onDelete(id)
    } catch (error) {
      console.error("Error deleting entry:", error)
      alert("Failed to delete entry")
    } finally {
      setDeletingId(null)
    }
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">No time entries found. Start by logging your first entry!</p>
        </CardContent>
      </Card>
    )
  }

  // Group entries by date
  const groupedEntries = entries.reduce(
    (groups, entry) => {
      const date = entry.date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(entry)
      return groups
    },
    {} as Record<string, TimeEntry[]>,
  )

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntries).map(([date, dateEntries]) => {
        const totalHours = dateEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
        const totalEarnings = dateEntries.reduce((sum, entry) => sum + entry.totalEarnings, 0)

        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="flex gap-4 text-sm">
                <Badge variant="secondary">{formatTime(totalHours)}</Badge>
                <Badge variant="outline" className="text-green-600">
                  {formatCurrency(totalEarnings)}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {dateEntries.map((entry) => (
                <Card key={entry._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="font-medium">
                            {entry.timeIn} - {entry.timeOut}
                          </span>
                          {entry.breakMinutes > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {entry.breakMinutes}min break
                            </Badge>
                          )}
                          <Badge variant="secondary">${entry.hourlyRate}/hr</Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span>{formatTime(entry.totalHours)}</span>
                          <span className="text-green-600 font-medium">{formatCurrency(entry.totalEarnings)}</span>
                        </div>

                        {entry.workDescription && (
                          <p className="text-sm text-muted-foreground">{entry.workDescription}</p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => onEdit(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(entry._id!)}
                          disabled={deletingId === entry._id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
