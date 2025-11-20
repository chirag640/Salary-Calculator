"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Calendar, Target, Star, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Confetti } from "@/components/confetti";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  target?: number;
  color: string;
}

interface AchievementsProps {
  totalHours: number;
  streak: number;
  totalEntries: number;
  weekHours: number;
  className?: string;
}

export function Achievements({
  totalHours,
  streak,
  totalEntries,
  weekHours,
  className,
}: AchievementsProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousUnlocked, setPreviousUnlocked] = useState<Set<string>>(
    new Set()
  );

  const achievements: Achievement[] = [
    {
      id: "first-entry",
      title: "First Steps",
      description: "Log your first time entry",
      icon: <Star className="h-5 w-5" />,
      unlocked: totalEntries >= 1,
      color: "text-yellow-500",
    },
    {
      id: "streak-3",
      title: "Getting Started",
      description: "Maintain a 3-day streak",
      icon: <Zap className="h-5 w-5" />,
      unlocked: streak >= 3,
      progress: Math.min(streak, 3),
      target: 3,
      color: "text-orange-500",
    },
    {
      id: "streak-7",
      title: "Week Warrior",
      description: "Maintain a 7-day streak",
      icon: <Calendar className="h-5 w-5" />,
      unlocked: streak >= 7,
      progress: Math.min(streak, 7),
      target: 7,
      color: "text-blue-500",
    },
    {
      id: "streak-30",
      title: "Consistency King",
      description: "Maintain a 30-day streak",
      icon: <Trophy className="h-5 w-5" />,
      unlocked: streak >= 30,
      progress: Math.min(streak, 30),
      target: 30,
      color: "text-purple-500",
    },
    {
      id: "hours-10",
      title: "Dedicated",
      description: "Log 10 total hours",
      icon: <Target className="h-5 w-5" />,
      unlocked: totalHours >= 10,
      progress: Math.min(totalHours, 10),
      target: 10,
      color: "text-green-500",
    },
    {
      id: "hours-100",
      title: "Centurion",
      description: "Log 100 total hours",
      icon: <Award className="h-5 w-5" />,
      unlocked: totalHours >= 100,
      progress: Math.min(totalHours, 100),
      target: 100,
      color: "text-pink-500",
    },
    {
      id: "week-40",
      title: "Full-Timer",
      description: "Log 40+ hours in a week",
      icon: <Trophy className="h-5 w-5" />,
      unlocked: weekHours >= 40,
      progress: Math.min(weekHours, 40),
      target: 40,
      color: "text-indigo-500",
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  // Detect new achievements and trigger confetti
  useEffect(() => {
    const currentUnlocked = new Set(
      achievements.filter((a) => a.unlocked).map((a) => a.id)
    );

    if (previousUnlocked.size > 0) {
      const newUnlocks = [...currentUnlocked].filter(
        (id) => !previousUnlocked.has(id)
      );
      if (newUnlocks.length > 0) {
        setShowConfetti(true);
      }
    }

    setPreviousUnlocked(currentUnlocked);
  }, [achievements.map((a) => a.unlocked).join(",")]);

  return (
    <>
      <Confetti
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Achievements
            </CardTitle>
            <Badge variant="secondary">
              {unlockedCount}/{totalCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  achievement.unlocked
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30 border-muted opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 p-2 rounded-full",
                    achievement.unlocked ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <div
                    className={
                      achievement.unlocked
                        ? achievement.color
                        : "text-muted-foreground"
                    }
                  >
                    {achievement.icon}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">
                      {achievement.title}
                    </h4>
                    {achievement.unlocked && (
                      <Badge variant="default" className="h-5 px-1.5 text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {achievement.description}
                  </p>

                  {!achievement.unlocked &&
                    achievement.target &&
                    achievement.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <span>
                            {achievement.progress}/{achievement.target}
                          </span>
                          <span className="text-[10px]">
                            (
                            {Math.round(
                              (achievement.progress / achievement.target) * 100
                            )}
                            %)
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                (achievement.progress / achievement.target) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
