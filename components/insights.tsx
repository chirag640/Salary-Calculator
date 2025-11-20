"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Clock, Calendar } from "lucide-react";
import type { TimeEntry } from "@/lib/types";
import { format, getDay, getHours } from "date-fns";

interface InsightsProps {
  entries: TimeEntry[];
  className?: string;
}

export function Insights({ entries, className }: InsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const generateInsights = () => {
      const newInsights: string[] = [];

      if (entries.length === 0) {
        newInsights.push("Start tracking to see personalized insights!");
        setInsights(newInsights);
        return;
      }

      // Most productive day of week
      const dayHours: Record<number, number> = {};
      entries.forEach((entry) => {
        const day = getDay(new Date(entry.date + "T00:00:00"));
        dayHours[day] = (dayHours[day] || 0) + entry.totalHours;
      });
      const mostProductiveDay = Object.entries(dayHours).sort(
        (a, b) => b[1] - a[1]
      )[0];
      if (mostProductiveDay && mostProductiveDay[1] > 0) {
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        newInsights.push(
          `💪 You're most productive on ${
            dayNames[parseInt(mostProductiveDay[0])]
          }s (${mostProductiveDay[1].toFixed(1)}h avg)`
        );
      }

      // Average daily hours
      const uniqueDays = new Set(entries.map((e) => e.date)).size;
      const avgHours =
        entries.reduce((sum, e) => sum + e.totalHours, 0) / uniqueDays;
      if (avgHours > 8) {
        newInsights.push(
          `⚡ You're logging ${avgHours.toFixed(
            1
          )}h/day on average - great consistency!`
        );
      } else if (avgHours > 4) {
        newInsights.push(
          `📈 You're averaging ${avgHours.toFixed(1)}h/day - room to grow!`
        );
      }

      // Most worked project
      const projectHours: Record<string, number> = {};
      entries.forEach((entry) => {
        const proj = entry.project || "No Project";
        projectHours[proj] = (projectHours[proj] || 0) + entry.totalHours;
      });
      const topProject = Object.entries(projectHours).sort(
        (a, b) => b[1] - a[1]
      )[0];
      if (topProject && topProject[0] !== "No Project") {
        newInsights.push(
          `🎯 "${topProject[0]}" is your top project (${topProject[1].toFixed(
            1
          )}h total)`
        );
      }

      // Recent streak
      const recentEntries = entries.slice(0, 7);
      if (recentEntries.length >= 7) {
        const totalRecent = recentEntries.reduce(
          (sum, e) => sum + e.totalHours,
          0
        );
        if (totalRecent > 35) {
          newInsights.push(
            "🔥 Amazing week! You logged over 35 hours in the last 7 days"
          );
        }
      }

      // Morning vs evening
      const morningHours = entries.filter((e) => {
        const hour = parseInt(e.timeIn?.split(":")[0] || "0");
        return hour >= 6 && hour < 12;
      }).length;
      const eveningHours = entries.filter((e) => {
        const hour = parseInt(e.timeIn?.split(":")[0] || "0");
        return hour >= 18 && hour < 24;
      }).length;

      if (morningHours > eveningHours * 1.5) {
        newInsights.push(
          "🌅 You're an early bird - most entries start in the morning"
        );
      } else if (eveningHours > morningHours * 1.5) {
        newInsights.push(
          "🌙 Night owl detected - you work best in the evenings"
        );
      }

      // Total earnings milestone
      const totalEarnings = entries.reduce(
        (sum, e) => sum + e.totalEarnings,
        0
      );
      if (totalEarnings > 10000) {
        newInsights.push(
          `💰 You've earned over $${totalEarnings.toFixed(
            0
          )} total - impressive!`
        );
      } else if (totalEarnings > 5000) {
        newInsights.push(
          `💵 You're at $${totalEarnings.toFixed(
            0
          )} total earnings - halfway to $10k!`
        );
      }

      setInsights(newInsights.slice(0, 4)); // Show max 4 insights
    };

    generateInsights();
  }, [entries]);

  if (insights.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-muted"
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <p className="text-sm leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
