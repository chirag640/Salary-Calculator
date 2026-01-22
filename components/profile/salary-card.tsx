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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Lock, AlertCircle, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import type { ProfileResponse, SalaryType } from "@/lib/types";

interface SalaryCardProps {
  isOnboarding: boolean;
  profile: ProfileResponse | null;
  currentSalary: number;
  setCurrentSalary: (salary: number) => void;
  currentSalaryType: SalaryType;
  setCurrentSalaryType: (type: SalaryType) => void;
  estimatedHourly: number;
  salaryRevealed: boolean;
  setSalaryRevealed: (revealed: boolean) => void;
  onShowPinDialog: () => void;
  onSaveSalary: () => Promise<void>;
  hoursPerDay: number;
  daysPerMonth: number;
}

export function SalaryCard({
  isOnboarding,
  profile,
  currentSalary,
  setCurrentSalary,
  currentSalaryType,
  setCurrentSalaryType,
  estimatedHourly,
  salaryRevealed,
  setSalaryRevealed,
  onShowPinDialog,
  onSaveSalary,
  hoursPerDay,
  daysPerMonth,
}: SalaryCardProps) {
  if (isOnboarding) {
    return (
      <Card className={!currentSalary ? "border-amber-500" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary & Rate
            <span className="text-sm text-destructive">*Required</span>
          </CardTitle>
          <CardDescription>
            Your salary information is used to calculate hourly rates and track
            earnings. This data is encrypted and kept private.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>
                Current Salary <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step={100}
                value={currentSalary}
                onChange={(e) => setCurrentSalary(Number(e.target.value))}
                className={!currentSalary ? "border-amber-500" : ""}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={currentSalaryType}
                onValueChange={(v) => setCurrentSalaryType(v as SalaryType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hourly Rate</Label>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 pt-2">
                {`₹${estimatedHourly.toFixed(2)}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Existing user view
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Salary Management
        </CardTitle>
        <CardDescription>Your salary is encrypted and secure</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.currentSalary ? (
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-6 rounded-xl border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Current Salary
              </span>
              {!salaryRevealed ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShowPinDialog}
                  className="text-xs gap-1.5"
                >
                  <Lock className="h-3 w-3" />
                  Show
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSalaryRevealed(false)}
                  className="text-xs gap-1.5"
                >
                  Hide
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {salaryRevealed ? (
                  <span className="text-3xl font-bold text-primary">
                    ₹{profile.currentSalary.amount.toLocaleString()}
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-8 bg-muted-foreground/20 rounded animate-pulse" />
                    <div className="w-16 h-8 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Per{" "}
                  {profile.currentSalary.salaryType === "monthly"
                    ? "Month"
                    : "Year"}
                </p>
                <p className="text-sm font-medium capitalize">
                  {profile.currentSalary.salaryType}
                </p>
              </div>
            </div>
            {salaryRevealed && (
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hourly Rate</span>
                <span className="font-semibold text-primary">
                  ₹{estimatedHourly.toFixed(2)}/hr
                </span>
              </div>
            )}
          </div>
        ) : (
          <Alert
            variant="default"
            className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
          >
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 dark:text-amber-200">
              No salary configured yet. Add your salary below to get started.
            </AlertDescription>
          </Alert>
        )}

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Add Salary Update</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Record a new salary when you receive an increment or promotion
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs font-medium">Amount</Label>
            <Input
              type="number"
              min={0}
              step={100}
              value={currentSalary || ""}
              onChange={(e) => setCurrentSalary(Number(e.target.value))}
              placeholder="0"
              className="h-9 text-sm"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs font-medium">Type</Label>
            <Select
              value={currentSalaryType}
              onValueChange={(v) => setCurrentSalaryType(v as SalaryType)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {currentSalary > 0 && (
          <div className="bg-muted/50 px-3 py-2 rounded-lg flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Estimated Hourly</span>
            <span className="font-semibold">
              ₹
              {(() => {
                let monthly = currentSalary;
                if (currentSalaryType === "annual")
                  monthly = currentSalary / 12;
                const hourly = monthly / (daysPerMonth * hoursPerDay);
                return hourly.toFixed(2);
              })()}
              /hr
            </span>
          </div>
        )}

        {currentSalary > 0 && (
          <Button
            type="button"
            size="sm"
            className="w-full h-9 text-sm"
            onClick={onSaveSalary}
          >
            Save New Salary
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
