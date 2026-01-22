"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  User,
  DollarSign,
  Clock,
  Save,
  AlertCircle,
  Lock,
  Calendar,
  Briefcase,
  Receipt,
  Percent,
  Plus,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import PinDialog from "@/components/pin-dialog";
import type { ProfileResponse, SalaryType, PaymentConfig } from "@/lib/types";
import { DEFAULT_PAYMENT_CONFIG } from "@/lib/types";
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf";
import { useToast } from "@/hooks/use-toast";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// Use centralized default from types.ts
const DEFAULT_PAYMENT_CONFIG_VALUE: PaymentConfig = {
  ...DEFAULT_PAYMENT_CONFIG,
  // Ensure taxDeductions has all UI fields initialized
  taxDeductions: {
    ...DEFAULT_PAYMENT_CONFIG.taxDeductions,
    taxRegime: "standard",
    fixedTaxPercentage: 0,
    professionalTax: 0,
    pfPercentage: 0,
    healthInsurance: 0,
    otherDeductions: [],
  },
  // Ensure allowances has all UI fields initialized
  allowances: {
    ...DEFAULT_PAYMENT_CONFIG.allowances,
    hra: 0,
    da: 0,
    transportAllowance: 0,
    medicalAllowance: 0,
    specialAllowance: 0,
    otherAllowances: [],
  },
};

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Basic info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Work config
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(22);

  // Current salary
  const [currentSalary, setCurrentSalary] = useState<number>(0);
  const [currentSalaryType, setCurrentSalaryType] =
    useState<SalaryType>("monthly");
  const [estimatedHourly, setEstimatedHourly] = useState<number>(0);

  // Payment Configuration
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(
    DEFAULT_PAYMENT_CONFIG_VALUE,
  );

  // PIN setup (for onboarding)
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");

  // PIN update (for existing users)
  const [showPinUpdate, setShowPinUpdate] = useState(false);
  const [oldPin, setOldPin] = useState<string>("");
  const [updatingPin, setUpdatingPin] = useState(false);

  // Salary reveal
  const [salaryRevealed, setSalaryRevealed] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

  const { fetchWithCsrf } = useFetchWithCsrf();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithCsrf("/api/profile", { method: "GET" });
        if (res.ok) {
          const data: ProfileResponse = await res.json();
          setProfile(data);
          setName(data.name);
          setEmail(data.email);
          setPhone(data.contact?.phone || "");
          setHoursPerDay(data.workingConfig?.hoursPerDay ?? 8);
          setDaysPerMonth(data.workingConfig?.daysPerMonth ?? 22);

          // Load payment config
          if (data.paymentConfig) {
            setPaymentConfig({
              ...DEFAULT_PAYMENT_CONFIG_VALUE,
              ...data.paymentConfig,
            });
          }

          // Load current salary from profile
          if (data.currentSalary && data.currentSalary.amount > 0) {
            // Calculate hourly rate for display (but don't set currentSalary)
            const hours = data.workingConfig?.hoursPerDay ?? 8;
            const days = data.workingConfig?.daysPerMonth ?? 22;
            let monthly = data.currentSalary.amount;
            if (data.currentSalary.salaryType === "annual")
              monthly = monthly / 12;
            const hourly = monthly / (days * hours);
            setEstimatedHourly(Number(hourly.toFixed(2)));
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-calculate hourly rate
  useEffect(() => {
    if (currentSalary > 0 && hoursPerDay > 0 && daysPerMonth > 0) {
      let monthly = currentSalary;
      if (currentSalaryType === "annual") monthly = currentSalary / 12;
      const hourly = monthly / (daysPerMonth * hoursPerDay);
      setEstimatedHourly(Number(hourly.toFixed(2)));
    } else if (currentSalary === 0) {
      setEstimatedHourly(0);
    }
  }, [currentSalary, currentSalaryType, hoursPerDay, daysPerMonth]);

  // Update payment config helper
  const updatePaymentConfig = (path: string, value: any) => {
    setPaymentConfig((prev) => {
      const newConfig = { ...prev };
      const keys = path.split(".");
      let current: any = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  // Toggle weekly off day
  const toggleWeeklyOff = (day: number) => {
    const currentOffs = paymentConfig.weeklyOffs.offDays;
    const newOffs = currentOffs.includes(day)
      ? currentOffs.filter((d) => d !== day)
      : [...currentOffs, day];
    updatePaymentConfig("weeklyOffs.offDays", newOffs);
  };

  const saveProfile = async () => {
    // Validate required fields for onboarding
    if (isOnboarding) {
      if (!currentSalary || currentSalary <= 0) {
        toast({
          title: "Salary Required",
          description: "Please enter your salary to continue",
          variant: "destructive",
        });
        return;
      }
      if (!hoursPerDay || hoursPerDay <= 0) {
        toast({
          title: "Work Hours Required",
          description: "Please set your working hours per day",
          variant: "destructive",
        });
        return;
      }
      if (!newPin || newPin.length < 4) {
        toast({
          title: "PIN Required",
          description:
            "Please set a 4-digit PIN to protect your salary information",
          variant: "destructive",
        });
        return;
      }
      if (!/^\d+$/.test(newPin)) {
        toast({
          title: "Invalid PIN",
          description: "PIN must contain only numbers",
          variant: "destructive",
        });
        return;
      }
      if (newPin !== confirmPin) {
        toast({
          title: "PIN Mismatch",
          description: "PIN and confirmation do not match",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      // First save salary if this is onboarding
      if (isOnboarding && currentSalary > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const salaryRes = await fetchWithCsrf("/api/profile/increment", {
          method: "POST",
          body: JSON.stringify({
            salaryType: currentSalaryType,
            amount: currentSalary,
            effectiveFrom: today,
            working: { hoursPerDay, daysPerMonth },
          }),
        });
        if (!salaryRes.ok) {
          throw new Error("Failed to save salary");
        }
      }

      // Update profile with payment config
      const res = await fetchWithCsrf("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          contact: { phone },
          workingConfig: { hoursPerDay, daysPerMonth },
          defaultHourlyRate: estimatedHourly,
          paymentConfig,
          profileComplete: true,
        }),
      });

      if (!res.ok) {
        toast({ title: "Save failed", variant: "destructive" });
        setSaving(false);
        return;
      }

      // If onboarding, set up PIN
      if (isOnboarding && newPin) {
        const pinRes = await fetchWithCsrf("/api/profile/pin", {
          method: "POST",
          body: JSON.stringify({ newPin }),
        });
        if (!pinRes.ok) {
          const pinError = await pinRes.json();
          toast({
            title: "PIN Setup Failed",
            description: pinError.error || "Could not set up PIN",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      // Success!
      toast({
        title: isOnboarding ? "Setup Complete!" : "Profile saved",
        description: isOnboarding
          ? "Welcome! You can now start tracking your time."
          : "Settings updated successfully",
      });

      if (isOnboarding) {
        window.location.href = "/";
      }
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="flex items-center justify-center h-64">
          <Clock className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {isOnboarding ? "Complete Your Profile" : "Profile Settings"}
        </h1>
        <p className="text-muted-foreground">
          {isOnboarding
            ? "Set up your salary and work schedule to get started"
            : "Manage your account and work preferences"}
        </p>
      </div>

      {isOnboarding && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Setup Required</AlertTitle>
          <AlertDescription>
            Please complete your profile by entering your{" "}
            <strong>salary</strong> and <strong>work schedule</strong>. This
            information is required to track your time and earnings accurately.
          </AlertDescription>
        </Alert>
      )}

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Config */}
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

      {/* Salary & Hourly Rate */}
      {isOnboarding ? (
        <Card className={!currentSalary ? "border-amber-500" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary & Rate
              <span className="text-sm text-destructive">*Required</span>
            </CardTitle>
            <CardDescription>
              Your salary information is used to calculate hourly rates and
              track earnings. This data is encrypted and kept private.
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Salary Management
            </CardTitle>
            <CardDescription>
              Your salary is encrypted and secure
            </CardDescription>
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
                      onClick={() => setShowPinDialog(true)}
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
                  No salary configured yet. Add your salary below to get
                  started.
                </AlertDescription>
              </Alert>
            )}

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-semibold">
                  Add Salary Update
                </Label>
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
                onClick={async () => {
                  try {
                    const today = new Date().toISOString().slice(0, 10);
                    const salaryRes = await fetchWithCsrf(
                      "/api/profile/increment",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          salaryType: currentSalaryType,
                          amount: currentSalary,
                          effectiveFrom: today,
                          working: { hoursPerDay, daysPerMonth },
                        }),
                      },
                    );
                    if (salaryRes.ok) {
                      toast({
                        title: "Salary Updated",
                        description:
                          "Your new salary has been saved successfully",
                      });
                      setCurrentSalary(0);
                      setSalaryRevealed(false);
                      // Reload profile
                      window.location.reload();
                    } else {
                      throw new Error("Failed to update salary");
                    }
                  } catch (error) {
                    toast({
                      title: "Update Failed",
                      description: "Could not update salary. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Save New Salary
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Salary Cycle Configuration */}
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

      {/* Weekly Offs Configuration */}
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

      {/* Leave Allowance */}
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
                updatePaymentConfig(
                  "leaveAllowance.carryForwardEnabled",
                  checked,
                )
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

      {/* Overtime Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Overtime Settings
          </CardTitle>
          <CardDescription>
            Configure overtime calculation rules
          </CardDescription>
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
                    value={
                      paymentConfig.overtime.maxOvertimeHoursPerMonth || 50
                    }
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

      {/* Tax & Deductions - Collapsible */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="tax-deductions">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5" />
                Tax & Deductions (Optional)
              </CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Tax Calculation</Label>
                    <p className="text-sm text-muted-foreground">
                      Calculate income tax deductions
                    </p>
                  </div>
                  <Switch
                    checked={paymentConfig.taxDeductions.taxEnabled}
                    onCheckedChange={(checked) =>
                      updatePaymentConfig("taxDeductions.taxEnabled", checked)
                    }
                  />
                </div>

                {paymentConfig.taxDeductions.taxEnabled && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Tax Percentage (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        step={0.1}
                        value={
                          paymentConfig.taxDeductions.fixedTaxPercentage || 0
                        }
                        onChange={(e) =>
                          updatePaymentConfig(
                            "taxDeductions.fixedTaxPercentage",
                            Number(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Tax Regime</Label>
                      <Select
                        value={
                          paymentConfig.taxDeductions.taxRegime || "standard"
                        }
                        onValueChange={(v) =>
                          updatePaymentConfig("taxDeductions.taxRegime", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="old">Old (India)</SelectItem>
                          <SelectItem value="new">New (India)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <Label>Professional Tax (monthly)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentConfig.taxDeductions.professionalTax || 0}
                      onChange={(e) =>
                        updatePaymentConfig(
                          "taxDeductions.professionalTax",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>PF/Pension Contribution (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      step={0.1}
                      value={paymentConfig.taxDeductions.pfPercentage || 0}
                      onChange={(e) =>
                        updatePaymentConfig(
                          "taxDeductions.pfPercentage",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Health Insurance (monthly)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={paymentConfig.taxDeductions.healthInsurance || 0}
                    onChange={(e) =>
                      updatePaymentConfig(
                        "taxDeductions.healthInsurance",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Allowances - Collapsible */}
        <AccordionItem value="allowances">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent className="h-5 w-5" />
                Allowances (Optional)
              </CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-0">
                <p className="text-sm text-muted-foreground">
                  These allowances will be added to your monthly earnings
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>HRA (House Rent Allowance)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentConfig.allowances.hra || 0}
                      onChange={(e) =>
                        updatePaymentConfig(
                          "allowances.hra",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>DA (Dearness Allowance)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentConfig.allowances.da || 0}
                      onChange={(e) =>
                        updatePaymentConfig(
                          "allowances.da",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Transport Allowance</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentConfig.allowances.transportAllowance || 0}
                      onChange={(e) =>
                        updatePaymentConfig(
                          "allowances.transportAllowance",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Medical Allowance</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentConfig.allowances.medicalAllowance || 0}
                      onChange={(e) =>
                        updatePaymentConfig(
                          "allowances.medicalAllowance",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Special Allowance</Label>
                  <Input
                    type="number"
                    min={0}
                    value={paymentConfig.allowances.specialAllowance || 0}
                    onChange={(e) =>
                      updatePaymentConfig(
                        "allowances.specialAllowance",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency & Locale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Currency</Label>
              <Select
                value={paymentConfig.currency}
                onValueChange={(v) => updatePaymentConfig("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                  <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                  <SelectItem value="EUR">€ EUR (Euro)</SelectItem>
                  <SelectItem value="GBP">£ GBP (British Pound)</SelectItem>
                  <SelectItem value="AUD">
                    A$ AUD (Australian Dollar)
                  </SelectItem>
                  <SelectItem value="CAD">C$ CAD (Canadian Dollar)</SelectItem>
                  <SelectItem value="JPY">¥ JPY (Japanese Yen)</SelectItem>
                  <SelectItem value="CNY">¥ CNY (Chinese Yuan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Locale</Label>
              <Select
                value={paymentConfig.locale}
                onValueChange={(v) => updatePaymentConfig("locale", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-IN">English (India)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="en-AU">English (Australia)</SelectItem>
                  <SelectItem value="de-DE">German</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                  <SelectItem value="ja-JP">Japanese</SelectItem>
                  <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIN Setup - Only show during onboarding */}
      {isOnboarding && (
        <Card
          className={!newPin || newPin !== confirmPin ? "border-amber-500" : ""}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔒 Security PIN Setup
              <span className="text-sm text-destructive">*Required</span>
            </CardTitle>
            <CardDescription>
              Set a 4-digit PIN to protect your salary information. You&apos;ll
              need this PIN to view your salary details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>
                  PIN (4+ digits) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Enter 4-6 digit PIN"
                  className={!newPin ? "border-amber-500" : ""}
                />
              </div>
              <div>
                <Label>
                  Confirm PIN <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Re-enter PIN"
                  className={
                    confirmPin && newPin !== confirmPin
                      ? "border-destructive"
                      : ""
                  }
                />
                {confirmPin && newPin !== confirmPin && (
                  <p className="text-sm text-destructive mt-1">
                    PINs do not match
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div
        className={
          isOnboarding
            ? "flex justify-center sticky bottom-6 z-10"
            : "flex justify-end"
        }
      >
        <Button
          onClick={saveProfile}
          disabled={saving}
          size="lg"
          className={
            isOnboarding ? "min-w-64 h-14 text-lg shadow-xl" : "min-w-32"
          }
        >
          {saving ? (
            <>{isOnboarding ? "Completing Setup..." : "Saving..."}</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isOnboarding ? "Complete Setup & Continue" : "Save Changes"}
            </>
          )}
        </Button>
      </div>

      {/* PIN Management - For existing users */}
      {!isOnboarding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security PIN
            </CardTitle>
            <CardDescription>
              Change your privacy PIN to protect sensitive financial information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPinUpdate ? (
              <Button
                onClick={() => setShowPinUpdate(true)}
                variant="outline"
                className="w-full md:w-auto"
              >
                <Lock className="mr-2 h-4 w-4" />
                Update PIN
              </Button>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (newPin !== confirmPin) {
                    toast({
                      title: "PIN Mismatch",
                      description: "New PINs do not match",
                      variant: "destructive",
                    });
                    return;
                  }
                  setUpdatingPin(true);
                  try {
                    const updateRes = await fetchWithCsrf("/api/profile/pin", {
                      method: "POST",
                      body: JSON.stringify({
                        currentPin: oldPin,
                        newPin,
                      }),
                    });

                    if (updateRes.ok) {
                      toast({
                        title: "PIN Updated",
                        description:
                          "Your security PIN has been changed successfully",
                      });
                      setShowPinUpdate(false);
                      setOldPin("");
                      setNewPin("");
                      setConfirmPin("");
                    } else {
                      const error = await updateRes.json();
                      toast({
                        title: "Update Failed",
                        description: error.error || "Could not update PIN",
                        variant: "destructive",
                      });
                    }
                  } catch {
                    toast({
                      title: "Error",
                      description: "Failed to update PIN",
                      variant: "destructive",
                    });
                  } finally {
                    setUpdatingPin(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Current PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={oldPin}
                    onChange={(e) =>
                      setOldPin(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="Enter current PIN"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>New PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) =>
                        setNewPin(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      placeholder="Enter new PIN"
                    />
                  </div>
                  <div>
                    <Label>Confirm New PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      placeholder="Confirm new PIN"
                    />
                  </div>
                </div>
                {newPin && confirmPin && newPin !== confirmPin && (
                  <p className="text-sm text-destructive">PINs do not match</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPinUpdate(false);
                      setOldPin("");
                      setNewPin("");
                      setConfirmPin("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      updatingPin ||
                      !oldPin ||
                      !newPin ||
                      !confirmPin ||
                      newPin !== confirmPin ||
                      newPin.length < 4
                    }
                  >
                    {updatingPin ? "Updating..." : "Update PIN"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* PIN Dialog for Salary Reveal */}
      <PinDialog
        open={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSuccess={() => {
          setSalaryRevealed(true);
          setShowPinDialog(false);
        }}
        title="Verify PIN"
        description="Enter your PIN to view salary information"
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
