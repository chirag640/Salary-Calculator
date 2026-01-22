"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime, formatCurrency } from "@/lib/time-utils";
import MaskedValue from "@/components/ui/masked-value";
import type { TimeEntry } from "@/lib/types";
import { Pencil, Trash2, Calendar, Clock, FileText } from "lucide-react";
import { TimerControls } from "@/components/timer-controls";
import { useToast } from "@/hooks/use-toast";
import { generateEntryPDF, downloadPDF, getWhatsAppShareLink } from "@/lib/pdf-generator";
import { generatePdfFileName, getDisplayName } from "@/lib/pdf-utils";

interface TimeEntryListProps {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
}

export function TimeEntryList({
  entries,
  onEdit,
  onDelete,
}: TimeEntryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time entry?")) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  };

  const handleGeneratePDF = async (entry: TimeEntry) => {
    try {
      // Fetch user profile to get the name
      let profileName = "";
      try {
        const profileRes = await fetch("/api/profile", { credentials: "same-origin" });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          profileName = profile.name || "";
        }
      } catch (e) {
        console.warn("Could not fetch profile for PDF name:", e);
      }
      
      const displayName = getDisplayName(profileName);
      const pdfBlob = generateEntryPDF(entry, displayName);
      const filename = generatePdfFileName(entry.date, profileName);
      
      // Download PDF first
      downloadPDF(pdfBlob, filename);
      
      toast({
        title: "PDF Generated!",
        description: `Downloaded ${filename}`,
      });
      
      // Share via Web Share API if supported (works on mobile and modern browsers)
      if (navigator.share && navigator.canShare) {
        try {
          // Create a File object from the blob
          const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
          
          const shareData = {
            files: [pdfFile],
            title: `Work Entry - ${entry.date}`,
            text: `Work entry for ${entry.date}\n\nTime: ${entry.timeIn} - ${entry.timeOut}\nWork: ${entry.workDescription || "See attached PDF"}`,
          };
          
          // Check if files can be shared
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast({
              title: "Shared Successfully!",
              description: "PDF shared via WhatsApp or selected app",
            });
          } else {
            // Fallback to text-only share
            await navigator.share({
              title: `Work Entry - ${entry.date}`,
              text: `Work entry for ${entry.date}\n\nTime: ${entry.timeIn} - ${entry.timeOut}\nWork: ${entry.workDescription || "PDF downloaded to your device"}`,
            });
          }
        } catch (shareError) {
          if ((shareError as Error).name !== "AbortError") {
            console.error("Share failed:", shareError);
            // Fallback to WhatsApp link
            openWhatsAppFallback(entry);
          }
        }
      } else {
        // Fallback for browsers that don't support Web Share API
        openWhatsAppFallback(entry);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate PDF. Make sure jsPDF is installed.",
        variant: "destructive",
      });
    }
  };

  const openWhatsAppFallback = (entry: TimeEntry) => {
    const shareMessage = `Work entry for ${entry.date}\n\nTime: ${entry.timeIn} - ${entry.timeOut}\nWork: ${entry.workDescription || "PDF downloaded - please attach manually"}\n\n⚠️ Note: PDF was downloaded to your device. Please attach it manually in WhatsApp.`;
    const whatsappLink = getWhatsAppShareLink(shareMessage);
    window.open(whatsappLink, "_blank");
    
    toast({
      title: "WhatsApp Opened",
      description: "Please attach the downloaded PDF manually",
      duration: 5000,
    });
  };

  if (entries.length === 0) {
    return (
      <Card className="hover:translate-y-[-1px] transition-transform">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No time entries found. Start by logging your first entry!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group entries by date
  const groupedEntries = entries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, TimeEntry[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntries).map(([date, dateEntries]) => {
        const totalHours = dateEntries.reduce(
          (sum, entry) => sum + entry.totalHours,
          0
        );
        const totalEarnings = dateEntries.reduce(
          (sum, entry) => sum + entry.totalEarnings,
          0
        );

        return (
          <div key={date}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-base md:text-lg font-semibold">
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
                <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{formatTime(totalHours)}</Badge>
                <Badge
                  variant="outline"
                  className="text-green-600 dark:text-green-400"
                >
                  <MaskedValue
                    value={totalEarnings}
                    format={(v) => formatCurrency(Number(v))}
                  />
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {dateEntries.map((entry) => (
                <div key={entry._id} className="space-y-2">
                  <Card
                    className={`hover:translate-y-[-1px] transition-transform ${
                      entry.deletedAt
                        ? "border-red-400/60 bg-red-50 dark:bg-red-950/30"
                        : ""
                    }`}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-medium text-sm md:text-base">
                              {entry.timeIn || "--:--"} -{" "}
                              {entry.timeOut || "--:--"}
                            </span>
                            {/* Break minutes no longer tracked; hourly rate shown for reference */}
                              <Badge variant="secondary" className="text-xs">
                              <MaskedValue
                                value={entry.hourlyRate}
                                format={(v) => `$${Number(v).toFixed(2)}/hr`}
                                ariaLabel="Hourly rate hidden"
                              />
                            </Badge>
                            {entry.deletedAt && (
                              <Badge variant="destructive">Deleted</Badge>
                            )}
                            {entry.timer?.isRunning &&
                              entry.timer?.status !== "stopped" &&
                              !entry.timer?.stoppedAt && (
                                <Badge
                                  variant="default"
                                  className="bg-green-500 gap-1"
                                >
                                  <Clock className="h-3 w-3" />
                                  Timer Running
                                </Badge>
                              )}
                            {entry.isHolidayWork && (
                              <Badge
                                variant="outline"
                                className="border-amber-500 text-amber-600 dark:text-amber-400"
                              >
                                {entry.holidayCategory === "sunday" &&
                                  "Sunday Work"}
                                {entry.holidayCategory === "saturday" &&
                                  "Saturday Work"}
                                {entry.holidayCategory === "other" &&
                                  "Holiday Work"}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mb-2">
                            <span>{formatTime(entry.totalHours)}</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              <MaskedValue
                                value={entry.totalEarnings}
                                format={(v) => `$${Number(v).toFixed(2)}`}
                                ariaLabel="Total earnings hidden"
                              />
                            </span>
                          </div>

                          {entry.workDescription && (
                            <p className="text-sm text-muted-foreground">
                              {entry.workDescription}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto">
                          <Button
                            onClick={() => handleGeneratePDF(entry)}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-initial"
                            title="Generate PDF & Share on WhatsApp"
                          >
                            <FileText className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">PDF</span>
                          </Button>
                          <Button
                            onClick={() => onEdit(entry)}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-initial"
                          >
                            <Pencil className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Edit</span>
                          </Button>
                          <Button
                            onClick={() => handleDelete(entry._id!)}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-initial text-destructive hover:bg-destructive/10"
                            disabled={deletingId === entry._id}
                          >
                            <Trash2 className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Show timer controls only for entries with running or paused timers (not stopped) */}
                  {entry._id &&
                    entry.timer &&
                    entry.timer.status !== "stopped" && (
                      <TimerControls
                        entryId={entry._id}
                        onTimerStop={() => {
                          // Refresh the entry list when timer stops
                          window.location.reload();
                        }}
                      />
                    )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
