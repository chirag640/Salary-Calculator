"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock } from "lucide-react";
import type { PaymentConfig } from "@/lib/types";

interface OvertimeSettingsCardProps {
  paymentConfig: PaymentConfig;
  updatePaymentConfig: (path: string, value: unknown) => void;
}

export function OvertimeSettingsCard({
  paymentConfig,
  updatePaymentConfig,
}: OvertimeSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Overtime Settings
        </CardTitle>
        <CardDescription>Configure overtime calculation rules</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Overtime Calculation</Label>
            <p className="text-sm text-muted-foreground">
              Calculate extra pay for hours beyond threshold
            </p>
          </div>
          <Switch
            checked={paymentConfig.overtime.enabled}
            onCheckedChange={(checked) =>
              updatePaymentConfig("overtime.enabled", checked)
            }
          />
        </div>

        {paymentConfig.overtime.enabled && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Threshold Hours (per day)</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={paymentConfig.overtime.thresholdHoursPerDay}
                  onChange={(e) =>
                    updatePaymentConfig(
                      "overtime.thresholdHoursPerDay",
                      Number(e.target.value),
                    )
                  }
                />
              </div>
              <div>
                <Label>Max OT Hours (per month)</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={paymentConfig.overtime.maxOvertimeHoursPerMonth || 50}
                  onChange={(e) =>
                    updatePaymentConfig(
                      "overtime.maxOvertimeHoursPerMonth",
                      Number(e.target.value),
                    )
                  }
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Regular OT Multiplier</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={paymentConfig.overtime.regularMultiplier}
                  onChange={(e) =>
                    updatePaymentConfig(
                      "overtime.regularMultiplier",
                      Number(e.target.value),
                    )
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  e.g., 1.5 = time-and-a-half
                </p>
              </div>
              <div>
                <Label>Weekend OT Multiplier</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={paymentConfig.overtime.weekendMultiplier}
                  onChange={(e) =>
                    updatePaymentConfig(
                      "overtime.weekendMultiplier",
                      Number(e.target.value),
                    )
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  e.g., 2 = double time
                </p>
              </div>
              <div>
                <Label>Holiday OT Multiplier</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={paymentConfig.overtime.holidayMultiplier}
                  onChange={(e) =>
                    updatePaymentConfig(
                      "overtime.holidayMultiplier",
                      Number(e.target.value),
                    )
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  e.g., 2.5 = two-and-a-half
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
