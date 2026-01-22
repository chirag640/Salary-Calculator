"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import type { PaymentConfig } from "@/lib/types";

interface SalaryCycleCardProps {
  paymentConfig: PaymentConfig;
  updatePaymentConfig: (path: string, value: unknown) => void;
}

export function SalaryCycleCard({
  paymentConfig,
  updatePaymentConfig,
}: SalaryCycleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Salary Cycle
        </CardTitle>
        <CardDescription>
          Configure when your salary cycle starts and ends each month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Use Calendar Month (1st - Last Day)</Label>
            <p className="text-sm text-muted-foreground">
              Standard monthly cycle from 1st to end of month
            </p>
          </div>
          <Switch
            checked={paymentConfig.salaryCycle.useCalendarMonth}
            onCheckedChange={(checked) =>
              updatePaymentConfig("salaryCycle.useCalendarMonth", checked)
            }
          />
        </div>

        {!paymentConfig.salaryCycle.useCalendarMonth && (
          <div>
            <Label>Cycle Start Day</Label>
            <p className="text-sm text-muted-foreground mb-2">
              E.g., if you set 19, cycle runs from 19th to 18th of next month
            </p>
            <Select
              value={String(paymentConfig.salaryCycle.cycleStartDay)}
              onValueChange={(v) =>
                updatePaymentConfig("salaryCycle.cycleStartDay", parseInt(v))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
