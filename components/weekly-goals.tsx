"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyGoalsProps {
  weekHours: number;
  weekEarnings: number;
  hoursGoal?: number;
  earningsGoal?: number;
  className?: string;
}

export function WeeklyGoals({
  weekHours,
  weekEarnings,
  hoursGoal = 40,
  earningsGoal = 1000,
  className,
}: WeeklyGoalsProps) {
  const hoursProgress = Math.min((weekHours / hoursGoal) * 100, 100);
  const earningsProgress = Math.min((weekEarnings / earningsGoal) * 100, 100);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "text-green-600 dark:text-green-400";
    if (progress >= 75) return "text-blue-600 dark:text-blue-400";
    if (progress >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getProgressMessage = (progress: number) => {
    if (progress >= 100) return "Goal achieved! 🎉";
    if (progress >= 75) return "Almost there!";
    if (progress >= 50) return "Halfway there!";
    if (progress >= 25) return "Good start!";
    return "Keep going!";
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Weekly Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hours Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Hours Goal</span>
            <span
              className={cn("font-semibold", getProgressColor(hoursProgress))}
            >
              {weekHours.toFixed(1)} / {hoursGoal}h
            </span>
          </div>
          <Progress value={hoursProgress} className="h-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {getProgressMessage(hoursProgress)}
            </span>
            <span className="text-xs font-medium">
              {hoursProgress.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Earnings Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Earnings Goal</span>
            <span
              className={cn(
                "font-semibold",
                getProgressColor(earningsProgress)
              )}
            >
              ${weekEarnings.toFixed(0)} / ${earningsGoal}
            </span>
          </div>
          <Progress value={earningsProgress} className="h-3" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {getProgressMessage(earningsProgress)}
            </span>
            <span className="text-xs font-medium">
              {earningsProgress.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="pt-4 border-t grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">
              {Math.max(0, hoursGoal - weekHours).toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground">Hours remaining</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              ${Math.max(0, earningsGoal - weekEarnings).toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">To goal</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
