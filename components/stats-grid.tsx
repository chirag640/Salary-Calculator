"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import MaskedValue from "@/components/ui/masked-value";

interface StatsGridProps {
  todayHours: number;
  todayEarnings: number;
  weekHours: number;
  weekEarnings: number;
  streak: number;
  topProject?: string;
  className?: string;
}

export function StatsGrid({
  todayHours,
  todayEarnings,
  weekHours,
  weekEarnings,
  streak,
  topProject,
  className,
}: StatsGridProps) {
  return (
    <div
      className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}
      role="region"
      aria-label="Statistics overview"
    >
      {/* Today's Hours */}
      <Card
        className="hover:shadow-lg transition-all border-2 hover:border-primary/20"
        role="article"
        aria-label="Today's work hours"
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            </div>
            <span className="text-sm text-muted-foreground">Today</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {todayHours.toFixed(1)}h
          </div>
          <div className="text-xs text-muted-foreground">
            <MaskedValue
              value={todayEarnings}
              format={(v) => `$${Number(v).toFixed(0)}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card className="hover:shadow-lg transition-all border-2 hover:border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
            </div>
            <span className="text-sm text-muted-foreground">This Week</span>
          </div>
          <div className="text-3xl font-bold mb-1">{weekHours.toFixed(1)}h</div>
          <div className="text-xs text-muted-foreground">
            <MaskedValue
              value={weekEarnings}
              format={(v) => `$${Number(v).toFixed(0)}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Streak */}
      <Card className="hover:shadow-lg transition-all border-2 hover:border-orange-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <span className="text-xl">🔥</span>
            </div>
            <span className="text-sm text-muted-foreground">Streak</span>
          </div>
          <div className="text-3xl font-bold mb-1">{streak}</div>
          <div className="text-xs text-muted-foreground">
            {streak === 1 ? "day" : "days"}
          </div>
        </CardContent>
      </Card>

      {/* Top Project */}
      <Card className="hover:shadow-lg transition-all border-2 hover:border-purple-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            </div>
            <span className="text-sm text-muted-foreground">Top Project</span>
          </div>
          <div className="text-xl font-bold mb-1 truncate">
            {topProject || "No project"}
          </div>
          <div className="text-xs text-muted-foreground">This week</div>
        </CardContent>
      </Card>
    </div>
  );
}
