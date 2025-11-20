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
import { User, DollarSign, Clock, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ProfileResponse, SalaryType } from "@/lib/types";
import { useCsrfToken } from "@/hooks/use-csrf";
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf";
import { useToast } from "@/hooks/use-toast";

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

  // PIN setup (for onboarding)
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");

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

          if (data.salaryHistory && data.salaryHistory.length > 0) {
            const latest = data.salaryHistory
              .slice()
              .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
              .at(-1);
            if (latest && latest.amount != null) {
              setCurrentSalary(latest.amount);
              setCurrentSalaryType(latest.salaryType || "monthly");
            }
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

      // Update profile first
      const res = await fetchWithCsrf("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name,
          contact: { phone },
          workingConfig: { hoursPerDay, daysPerMonth },
          defaultHourlyRate: estimatedHourly,
          profileComplete: true, // Mark as complete
        }),
      });

      if (!res.ok) {
        toast({ title: "Save failed", variant: "destructive" });
        setSaving(false);
        return;
      }

      // If onboarding, set up PIN (this will regenerate token with pinSetup: true)
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
        // Force page reload to update JWT token and redirect
        window.location.href = "/";
      }
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateSalary = async () => {
    if (currentSalary <= 0) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetchWithCsrf("/api/profile/increment", {
        method: "POST",
        body: JSON.stringify({
          salaryType: currentSalaryType,
          amount: currentSalary,
          effectiveFrom: today,
          working: { hoursPerDay, daysPerMonth },
        }),
      });

      if (res.ok) {
        // Refresh profile to get updated salary history
        const profileRes = await fetchWithCsrf("/api/profile", {
          method: "GET",
        });
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        toast({
          title: "Salary updated",
          description: "Hourly rate recalculated and saved",
        });
      } else {
        toast({ title: "Update failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
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
      <Card
        className={isOnboarding && !currentSalary ? "border-amber-500" : ""}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary & Rate
            {isOnboarding && (
              <span className="text-sm text-destructive">*Required</span>
            )}
          </CardTitle>
          {isOnboarding && (
            <CardDescription>
              Your salary information is used to calculate hourly rates and
              track earnings. This data is encrypted and kept private.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>
                Current Salary{" "}
                {isOnboarding && <span className="text-destructive">*</span>}
              </Label>
              <Input
                type="number"
                min={0}
                step={100}
                value={currentSalary}
                onChange={(e) => setCurrentSalary(Number(e.target.value))}
                className={
                  isOnboarding && !currentSalary ? "border-amber-500" : ""
                }
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
                ${estimatedHourly.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={updateSalary} variant="outline" size="sm">
              Update Salary
            </Button>
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
              Set a 4-digit PIN to protect your salary information. You'll need
              this PIN to view your salary details.
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

      {/* Salary History */}
      {profile?.salaryHistory && profile.salaryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Salary History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.salaryHistory
                .slice()
                .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                .slice(0, 5)
                .map((record, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{record.effectiveFrom}</div>
                      <div className="text-sm text-muted-foreground">
                        {record.note || "Salary update"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {record.amount != null
                          ? `$${record.amount.toLocaleString()}`
                          : "••••••"}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {record.salaryType || "monthly"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
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
