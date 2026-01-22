"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PinDialog from "@/components/pin-dialog";
import type { ProfileResponse, SalaryType, PaymentConfig } from "@/lib/types";
import { DEFAULT_PAYMENT_CONFIG } from "@/lib/types";
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf";
import { useToast } from "@/hooks/use-toast";

// Import profile section components
import {
  PersonalDetailsCard,
  WorkScheduleCard,
  SalaryCard,
  SalaryCycleCard,
  WeeklyOffsCard,
  LeaveAllowanceCard,
  OvertimeSettingsCard,
  TaxDeductionsAccordion,
  CurrencyLocaleCard,
  PinSetupCard,
  PinManagementCard,
} from "@/components/profile";

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
    DEFAULT_PAYMENT_CONFIG_VALUE
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
  const updatePaymentConfig = (path: string, value: unknown) => {
    setPaymentConfig((prev) => {
      const newConfig = { ...prev };
      const keys = path.split(".");
      let current: Record<string, unknown> = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
        current = current[keys[i]] as Record<string, unknown>;
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

  // Save new salary (for existing users)
  const handleSaveSalary = async () => {
    try {
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
      if (salaryRes.ok) {
        toast({
          title: "Salary Updated",
          description: "Your new salary has been saved successfully",
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
  };

  // Handle PIN update
  const handleUpdatePin = async (e: React.FormEvent) => {
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
          description: "Your security PIN has been changed successfully",
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
      <PersonalDetailsCard
        name={name}
        setName={setName}
        email={email}
        phone={phone}
        setPhone={setPhone}
      />

      {/* Work Config */}
      <WorkScheduleCard
        hoursPerDay={hoursPerDay}
        setHoursPerDay={setHoursPerDay}
        daysPerMonth={daysPerMonth}
        setDaysPerMonth={setDaysPerMonth}
      />

      {/* Salary & Hourly Rate */}
      <SalaryCard
        isOnboarding={isOnboarding}
        profile={profile}
        currentSalary={currentSalary}
        setCurrentSalary={setCurrentSalary}
        currentSalaryType={currentSalaryType}
        setCurrentSalaryType={setCurrentSalaryType}
        estimatedHourly={estimatedHourly}
        salaryRevealed={salaryRevealed}
        setSalaryRevealed={setSalaryRevealed}
        onShowPinDialog={() => setShowPinDialog(true)}
        onSaveSalary={handleSaveSalary}
        hoursPerDay={hoursPerDay}
        daysPerMonth={daysPerMonth}
      />

      {/* Salary Cycle Configuration */}
      <SalaryCycleCard
        paymentConfig={paymentConfig}
        updatePaymentConfig={updatePaymentConfig}
      />

      {/* Weekly Offs Configuration */}
      <WeeklyOffsCard
        paymentConfig={paymentConfig}
        updatePaymentConfig={updatePaymentConfig}
        toggleWeeklyOff={toggleWeeklyOff}
      />

      {/* Leave Allowance */}
      <LeaveAllowanceCard
        paymentConfig={paymentConfig}
        updatePaymentConfig={updatePaymentConfig}
      />

      {/* Overtime Configuration */}
      <OvertimeSettingsCard
        paymentConfig={paymentConfig}
        updatePaymentConfig={updatePaymentConfig}
      />

      {/* Tax & Deductions - Collapsible */}
      <TaxDeductionsAccordion
        paymentConfig={paymentConfig}
        updatePaymentConfig={updatePaymentConfig}
      />

      {/* Currency Settings */}
      <CurrencyLocaleCard
        paymentConfig={paymentConfig}
        updatePaymentConfig={updatePaymentConfig}
      />

      {/* PIN Setup - Only show during onboarding */}
      {isOnboarding && (
        <PinSetupCard
          newPin={newPin}
          setNewPin={setNewPin}
          confirmPin={confirmPin}
          setConfirmPin={setConfirmPin}
        />
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
        <PinManagementCard
          showPinUpdate={showPinUpdate}
          setShowPinUpdate={setShowPinUpdate}
          oldPin={oldPin}
          setOldPin={setOldPin}
          newPin={newPin}
          setNewPin={setNewPin}
          confirmPin={confirmPin}
          setConfirmPin={setConfirmPin}
          updatingPin={updatingPin}
          onUpdatePin={handleUpdatePin}
        />
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
