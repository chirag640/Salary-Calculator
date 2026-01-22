"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase } from "lucide-react";
import type { PaymentConfig } from "@/lib/types";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface WeeklyOffsCardProps {
  paymentConfig: PaymentConfig;
  updatePaymentConfig: (path: string, value: unknown) => void;
  toggleWeeklyOff: (day: number) => void;
}

export function WeeklyOffsCard({
  paymentConfig,
  updatePaymentConfig,
  toggleWeeklyOff,
}: WeeklyOffsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Weekly Offs
        </CardTitle>
        <CardDescription>
          Select which days are weekly offs (non-working days)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block">Regular Weekly Offs</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.filter((day) => day.value !== 6).map((day) => (
              <Button
                key={day.value}
                type="button"
                variant={
                  paymentConfig.weeklyOffs.offDays.includes(day.value)
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => toggleWeeklyOff(day.value)}
              >
                {day.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <Label>Saturday Configuration</Label>
          <Select
            value={paymentConfig.weeklyOffs.saturdayMode || "working"}
            onValueChange={(value) => {
              updatePaymentConfig("weeklyOffs.saturdayMode", value);
              // Update legacy flags for backward compatibility
              if (value === "all-off") {
                updatePaymentConfig("weeklyOffs.offDays", [
                  ...paymentConfig.weeklyOffs.offDays.filter((d) => d !== 6),
                  6,
                ]);
              } else {
                updatePaymentConfig(
                  "weeklyOffs.offDays",
                  paymentConfig.weeklyOffs.offDays.filter((d) => d !== 6),
                );
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="working">All Saturdays Working</SelectItem>
              <SelectItem value="all-off">All Saturdays Off</SelectItem>
              <SelectItem value="alternate-1-3">
                1st & 3rd Saturday Off
              </SelectItem>
              <SelectItem value="alternate-2-4">
                2nd & 4th Saturday Off
              </SelectItem>
              <SelectItem value="half-day">All Saturdays Half Day</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {paymentConfig.weeklyOffs.saturdayMode === "all-off" &&
              "Every Saturday is a holiday"}
            {paymentConfig.weeklyOffs.saturdayMode === "working" &&
              "Saturdays are regular working days"}
            {paymentConfig.weeklyOffs.saturdayMode === "alternate-1-3" &&
              "First and third Saturday of each month are off"}
            {paymentConfig.weeklyOffs.saturdayMode === "alternate-2-4" &&
              "Second and fourth Saturday of each month are off"}
            {paymentConfig.weeklyOffs.saturdayMode === "half-day" &&
              "Saturdays count as half working days (50% hours)"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
