"use client";

import { useState } from "react";
import { MotionProvider, Motion } from "@/components/motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Quick date presets
  const setQuickDates = (preset: string) => {
    const today = new Date();
    const end = today.toISOString().split("T")[0];
    let start = "";

    if (preset === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      start = weekAgo.toISOString().split("T")[0];
    } else if (preset === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      start = monthAgo.toISOString().split("T")[0];
    } else if (preset === "3months") {
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      start = threeMonthsAgo.toISOString().split("T")[0];
    }

    setStartDate(start);
    setEndDate(end);
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Dates Required",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/export?startDate=${startDate}&endDate=${endDate}&format=csv`,
        { credentials: "same-origin" }
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `time-entries-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: "Your data has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionProvider>
      <Motion>
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Export Data</h1>
            <p className="text-muted-foreground">
              Download your time entries as CSV
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export Time Entries</CardTitle>
              <CardDescription>
                Select a date range to export your time tracking data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Presets */}
              <div>
                <Label className="mb-2 block">Quick Select</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDates("week")}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDates("month")}
                  >
                    Last Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDates("3months")}
                  >
                    Last 3 Months
                  </Button>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={loading || !startDate || !endDate}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>Exporting...</>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </>
                )}
              </Button>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• CSV format includes all time entry details</p>
                <p>• Compatible with Excel and Google Sheets</p>
                <p>• Includes work descriptions, projects, and earnings</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Motion>
    </MotionProvider>
  );
}
