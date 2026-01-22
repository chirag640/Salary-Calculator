"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface WorkScheduleCardProps {
  hoursPerDay: number;
  setHoursPerDay: (hours: number) => void;
  daysPerMonth: number;
  setDaysPerMonth: (days: number) => void;
}

export function WorkScheduleCard({
  hoursPerDay,
  setHoursPerDay,
  daysPerMonth,
  setDaysPerMonth,
}: WorkScheduleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Work Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Hours per Day</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Working Days per Month</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={daysPerMonth}
              onChange={(e) => setDaysPerMonth(Number(e.target.value))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
