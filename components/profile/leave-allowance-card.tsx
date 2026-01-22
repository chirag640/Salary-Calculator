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
import { Calendar } from "lucide-react";
import type { PaymentConfig } from "@/lib/types";

interface LeaveAllowanceCardProps {
  paymentConfig: PaymentConfig;
  updatePaymentConfig: (path: string, value: unknown) => void;
}

export function LeaveAllowanceCard({
  paymentConfig,
  updatePaymentConfig,
}: LeaveAllowanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Leave Allowance
        </CardTitle>
        <CardDescription>Configure paid leave entitlements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Casual Leave (per month)</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={paymentConfig.leaveAllowance.casualLeavePerMonth}
              onChange={(e) =>
                updatePaymentConfig(
                  "leaveAllowance.casualLeavePerMonth",
                  Number(e.target.value),
                )
              }
            />
          </div>
          <div>
            <Label>Sick Leave (per month)</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={paymentConfig.leaveAllowance.sickLeavePerMonth}
              onChange={(e) =>
                updatePaymentConfig(
                  "leaveAllowance.sickLeavePerMonth",
                  Number(e.target.value),
                )
              }
            />
          </div>
        </div>

        <div>
          <Label>Earned Leave (per year)</Label>
          <Input
            type="number"
            min={0}
            max={30}
            value={paymentConfig.leaveAllowance.earnedLeavePerYear}
            onChange={(e) =>
              updatePaymentConfig(
                "leaveAllowance.earnedLeavePerYear",
                Number(e.target.value),
              )
            }
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <Label>Carry Forward Leave</Label>
            <p className="text-sm text-muted-foreground">
              Allow unused leave to carry forward
            </p>
          </div>
          <Switch
            checked={paymentConfig.leaveAllowance.carryForwardEnabled}
            onCheckedChange={(checked) =>
              updatePaymentConfig("leaveAllowance.carryForwardEnabled", checked)
            }
          />
        </div>

        {paymentConfig.leaveAllowance.carryForwardEnabled && (
          <div>
            <Label>Max Carry Forward Days</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={paymentConfig.leaveAllowance.maxCarryForwardDays}
              onChange={(e) =>
                updatePaymentConfig(
                  "leaveAllowance.maxCarryForwardDays",
                  Number(e.target.value),
                )
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
