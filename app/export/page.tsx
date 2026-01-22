"use client";

import { useState, useEffect } from "react";
import { MotionProvider, Motion } from "@/components/motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Calendar,
  FileText,
  Receipt,
  Loader2,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFetchWithCsrf } from "@/hooks/use-fetch-with-csrf";
import PinDialog from "@/components/pin-dialog";
import type { PayslipData } from "@/lib/types";

interface PayCycle {
  startDate: string;
  endDate: string;
  entriesCount: number;
  hasData: boolean;
}

export default function ExportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"csv" | "payslip" | null>(
    null,
  );
  const { toast } = useToast();
  const { fetchWithCsrf } = useFetchWithCsrf();

  // Payslip state
  const [payCycles, setPayCycles] = useState<PayCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>("");
  const [currentCycle, setCurrentCycle] = useState<PayCycle | null>(null);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [generatingPayslip, setGeneratingPayslip] = useState(false);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);

  // Load pay cycles
  useEffect(() => {
    const loadCycles = async () => {
      try {
        const res = await fetchWithCsrf("/api/export/payslip", {
          method: "GET",
        });
        if (res.ok) {
          const data = await res.json();
          setPayCycles(data.cycles || []);
          setCurrentCycle(data.currentCycle);
          if (data.cycles?.length > 0) {
            setSelectedCycle(
              `${data.cycles[data.cycles.length - 1].startDate}|${data.cycles[data.cycles.length - 1].endDate}`,
            );
          }
        }
      } catch (error) {
        console.error("Failed to load pay cycles:", error);
      } finally {
        setLoadingCycles(false);
      }
    };
    loadCycles();
  }, []);

  // Quick date presets
  const setQuickDates = (preset: string) => {
    const today = new Date();
    const end = today.toISOString().split("T")[0];
    let start = "";

    if (preset === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      start = weekAgo.toISOString().split("T")[0];
    } else if (preset === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      start = monthAgo.toISOString().split("T")[0];
    } else if (preset === "3months") {
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      start = threeMonthsAgo.toISOString().split("T")[0];
    }

    setStartDate(start);
    setEndDate(end);
  };

  const initiateExport = (action: "csv" | "payslip") => {
    if (action === "csv" && (!startDate || !endDate)) {
      toast({
        title: "Dates Required",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }
    if (action === "payslip" && !selectedCycle) {
      toast({
        title: "Pay Period Required",
        description: "Please select a pay period",
        variant: "destructive",
      });
      return;
    }
    setPendingAction(action);
    setShowPinModal(true);
  };

  const handlePinSuccess = async () => {
    if (pendingAction === "csv") {
      await handleCsvExport();
    } else if (pendingAction === "payslip") {
      await generatePayslip();
    }
    setPendingAction(null);
  };

  const handleCsvExport = async () => {
    setLoading(true);
    try {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrf-token="))
        ?.split("=")[1];

      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          startDate,
          endDate,
          format: "csv",
          includeLeave: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `time-entries-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: "Your data has been downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description:
          error.message || "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePayslip = async () => {
    setGeneratingPayslip(true);
    setPayslipData(null);
    try {
      const [cycleSt, cycleEnd] = selectedCycle.split("|");
      const res = await fetchWithCsrf("/api/export/payslip", {
        method: "POST",
        body: JSON.stringify({
          startDate: cycleSt,
          endDate: cycleEnd,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate payslip");
      }

      const data = await res.json();
      setPayslipData(data.payslip);

      toast({
        title: "Payslip Generated",
        description: `Generated for ${formatDateRange(cycleSt, cycleEnd)}`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate payslip",
        variant: "destructive",
      });
    } finally {
      setGeneratingPayslip(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const downloadPayslipPdf = () => {
    // For now, create a printable HTML version
    if (!payslipData) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = generatePayslipHtml(payslipData);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePayslipHtml = (data: PayslipData) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Payslip - ${formatDateRange(data.periodStart, data.periodEnd)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { color: #666; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #eee; }
    .item-label { color: #666; }
    .item-value { font-weight: 500; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 30px; }
    .summary .item { border-bottom: none; padding: 8px 0; }
    .summary .total { font-size: 18px; font-weight: bold; color: #2563eb; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }
    .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>PAYSLIP</h1>
    <p>Pay Period: ${formatDateRange(data.periodStart, data.periodEnd)}</p>
    <p>Generated: ${new Date(data.generatedAt).toLocaleDateString()}</p>
    <p>Payslip ID: ${data.id}</p>
  </div>

  <div class="grid">
    <div class="section">
      <div class="section-title">Period Summary</div>
      <div class="item"><span class="item-label">Total Days</span><span class="item-value">${data.period.totalDays}</span></div>
      <div class="item"><span class="item-label">Working Days</span><span class="item-value">${data.period.workingDays}</span></div>
      <div class="item"><span class="item-label">Weekly Offs</span><span class="item-value">${data.period.weeklyOffs}</span></div>
      <div class="item"><span class="item-label">Holidays</span><span class="item-value">${data.period.holidays}</span></div>
    </div>

    <div class="section">
      <div class="section-title">Attendance</div>
      <div class="item"><span class="item-label">Days Present</span><span class="item-value">${data.attendance.daysPresent}</span></div>
      <div class="item"><span class="item-label">Days Absent</span><span class="item-value">${data.attendance.daysAbsent}</span></div>
      <div class="item"><span class="item-label">Half Days</span><span class="item-value">${data.attendance.halfDays}</span></div>
      <div class="item"><span class="item-label">Late Arrivals</span><span class="item-value">${data.attendance.lateArrivals}</span></div>
      <div class="item"><span class="item-label">Paid Leave</span><span class="item-value">${data.attendance.paidLeave}</span></div>
      <div class="item"><span class="item-label">Unpaid Leave</span><span class="item-value">${data.attendance.unpaidLeave}</span></div>
      <div class="item"><span class="item-label">Hours Worked</span><span class="item-value">${data.attendance.totalHoursWorked}h</span></div>
    </div>
  </div>

  <div class="grid">
    <div class="section">
      <div class="section-title">Earnings</div>
      <div class="item"><span class="item-label">Basic Pay</span><span class="item-value">${formatCurrency(data.earnings.basicPay)}</span></div>
      ${data.earnings.hra > 0 ? `<div class="item"><span class="item-label">HRA</span><span class="item-value">${formatCurrency(data.earnings.hra)}</span></div>` : ""}
      ${data.earnings.da > 0 ? `<div class="item"><span class="item-label">DA</span><span class="item-value">${formatCurrency(data.earnings.da)}</span></div>` : ""}
      ${data.earnings.transportAllowance > 0 ? `<div class="item"><span class="item-label">Transport</span><span class="item-value">${formatCurrency(data.earnings.transportAllowance)}</span></div>` : ""}
      ${data.earnings.medicalAllowance > 0 ? `<div class="item"><span class="item-label">Medical</span><span class="item-value">${formatCurrency(data.earnings.medicalAllowance)}</span></div>` : ""}
      ${data.earnings.specialAllowance > 0 ? `<div class="item"><span class="item-label">Special</span><span class="item-value">${formatCurrency(data.earnings.specialAllowance)}</span></div>` : ""}
      ${data.earnings.overtimePay > 0 ? `<div class="item"><span class="item-label">Overtime</span><span class="item-value">${formatCurrency(data.earnings.overtimePay)}</span></div>` : ""}
      ${data.earnings.weekendPay > 0 ? `<div class="item"><span class="item-label">Weekend Work</span><span class="item-value">${formatCurrency(data.earnings.weekendPay)}</span></div>` : ""}
      <div class="item" style="font-weight: bold; border-top: 1px solid #ccc; margin-top: 10px; padding-top: 10px;"><span class="item-label">Gross Earnings</span><span class="item-value">${formatCurrency(data.earnings.grossEarnings)}</span></div>
    </div>

    <div class="section">
      <div class="section-title">Deductions</div>
      ${data.deductions.incomeTax > 0 ? `<div class="item"><span class="item-label">Income Tax</span><span class="item-value">${formatCurrency(data.deductions.incomeTax)}</span></div>` : ""}
      ${data.deductions.professionalTax > 0 ? `<div class="item"><span class="item-label">Professional Tax</span><span class="item-value">${formatCurrency(data.deductions.professionalTax)}</span></div>` : ""}
      ${data.deductions.providentFund > 0 ? `<div class="item"><span class="item-label">Provident Fund</span><span class="item-value">${formatCurrency(data.deductions.providentFund)}</span></div>` : ""}
      ${data.deductions.healthInsurance > 0 ? `<div class="item"><span class="item-label">Health Insurance</span><span class="item-value">${formatCurrency(data.deductions.healthInsurance)}</span></div>` : ""}
      ${data.deductions.unpaidLeaveDeduction > 0 ? `<div class="item"><span class="item-label">Unpaid Leave</span><span class="item-value">${formatCurrency(data.deductions.unpaidLeaveDeduction)}</span></div>` : ""}
      ${data.deductions.lateDeduction > 0 ? `<div class="item"><span class="item-label">Late Penalty</span><span class="item-value">${formatCurrency(data.deductions.lateDeduction)}</span></div>` : ""}
      ${data.deductions.otherDeductions > 0 ? `<div class="item"><span class="item-label">Other</span><span class="item-value">${formatCurrency(data.deductions.otherDeductions)}</span></div>` : ""}
      <div class="item" style="font-weight: bold; border-top: 1px solid #ccc; margin-top: 10px; padding-top: 10px;"><span class="item-label">Total Deductions</span><span class="item-value">${formatCurrency(data.deductions.totalDeductions)}</span></div>
    </div>
  </div>

  <div class="summary">
    <div class="item"><span class="item-label">Gross Salary</span><span class="item-value">${formatCurrency(data.summary.grossSalary)}</span></div>
    <div class="item"><span class="item-label">Total Deductions</span><span class="item-value">- ${formatCurrency(data.summary.totalDeductions)}</span></div>
    <div class="item total"><span class="item-label">NET SALARY</span><span class="item-value">${formatCurrency(data.summary.netSalary)}</span></div>
  </div>

  <div class="footer">
    <p>This is a computer-generated payslip and does not require a signature.</p>
    <p>Generated by Time Tracker</p>
  </div>
</body>
</html>`;
  };

  return (
    <MotionProvider>
      <Motion>
        <div className="container mx-auto max-w-4xl p-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Export & Payslip</h1>
            <p className="text-muted-foreground">
              Download your time entries or generate monthly payslips
            </p>
          </div>

          <Tabs defaultValue="payslip" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payslip" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Payslip
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CSV Export
              </TabsTrigger>
            </TabsList>

            {/* Payslip Tab */}
            <TabsContent value="payslip" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Monthly Payslip</CardTitle>
                  <CardDescription>
                    Auto-calculate your earnings based on tracked time entries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pay Period Selection */}
                  <div className="space-y-2">
                    <Label>Select Pay Period</Label>
                    {loadingCycles ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading pay periods...
                      </div>
                    ) : (
                      <Select
                        value={selectedCycle}
                        onValueChange={setSelectedCycle}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a pay period" />
                        </SelectTrigger>
                        <SelectContent>
                          {payCycles.map((cycle) => (
                            <SelectItem
                              key={`${cycle.startDate}|${cycle.endDate}`}
                              value={`${cycle.startDate}|${cycle.endDate}`}
                            >
                              <div className="flex items-center gap-2">
                                <span>
                                  {formatDateRange(
                                    cycle.startDate,
                                    cycle.endDate,
                                  )}
                                </span>
                                {cycle.hasData ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {cycle.entriesCount} entries
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    No data
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <Button
                    onClick={() => initiateExport("payslip")}
                    disabled={generatingPayslip || !selectedCycle}
                    className="w-full"
                    size="lg"
                  >
                    {generatingPayslip ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Receipt className="mr-2 h-4 w-4" />
                        Generate Payslip
                      </>
                    )}
                  </Button>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      • Calculates earnings based on your tracked time entries
                    </p>
                    <p>• Includes overtime, allowances, and deductions</p>
                    <p>• Uses your profile settings for calculation</p>
                    <p>• You'll be asked to enter your PIN for security</p>
                  </div>
                </CardContent>
              </Card>

              {/* Payslip Preview */}
              {payslipData && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Payslip Preview</CardTitle>
                      <CardDescription>
                        {formatDateRange(
                          payslipData.periodStart,
                          payslipData.periodEnd,
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={downloadPayslipPdf}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm">Gross</span>
                        </div>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300">
                          {formatCurrency(payslipData.summary.grossSalary)}
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                          <TrendingDown className="h-4 w-4" />
                          <span className="text-sm">Deductions</span>
                        </div>
                        <p className="text-xl font-bold text-red-700 dark:text-red-300">
                          {formatCurrency(payslipData.summary.totalDeductions)}
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                          <IndianRupee className="h-4 w-4" />
                          <span className="text-sm">Net Pay</span>
                        </div>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                          {formatCurrency(payslipData.summary.netSalary)}
                        </p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Hours</span>
                        </div>
                        <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                          {payslipData.attendance.totalHoursWorked}h
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Attendance & Period */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Period Summary
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Total Days
                            </span>
                            <span>{payslipData.period.totalDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Working Days
                            </span>
                            <span>{payslipData.period.workingDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Weekly Offs
                            </span>
                            <span>{payslipData.period.weeklyOffs}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Attendance
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Days Present
                            </span>
                            <span className="text-green-600">
                              {payslipData.attendance.daysPresent}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Days Absent
                            </span>
                            <span className="text-red-600">
                              {payslipData.attendance.daysAbsent}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Late Arrivals
                            </span>
                            <span className="text-amber-600">
                              {payslipData.attendance.lateArrivals}
                            </span>
                          </div>
                          {payslipData.attendance.overtimeHours > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Overtime Hours
                              </span>
                              <span className="text-blue-600">
                                {payslipData.attendance.overtimeHours}h
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Earnings & Deductions */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 text-green-600">
                          Earnings
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Basic Pay
                            </span>
                            <span>
                              {formatCurrency(payslipData.earnings.basicPay)}
                            </span>
                          </div>
                          {payslipData.earnings.hra > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">HRA</span>
                              <span>
                                {formatCurrency(payslipData.earnings.hra)}
                              </span>
                            </div>
                          )}
                          {payslipData.earnings.da > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">DA</span>
                              <span>
                                {formatCurrency(payslipData.earnings.da)}
                              </span>
                            </div>
                          )}
                          {payslipData.earnings.transportAllowance > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Transport
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.earnings.transportAllowance,
                                )}
                              </span>
                            </div>
                          )}
                          {payslipData.earnings.overtimePay > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Overtime Pay
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.earnings.overtimePay,
                                )}
                              </span>
                            </div>
                          )}
                          {payslipData.earnings.weekendPay > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Weekend Work
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.earnings.weekendPay,
                                )}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                            <span>Total Earnings</span>
                            <span className="text-green-600">
                              {formatCurrency(
                                payslipData.earnings.grossEarnings,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3 text-red-600">
                          Deductions
                        </h4>
                        <div className="space-y-2 text-sm">
                          {payslipData.deductions.incomeTax > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Income Tax
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.deductions.incomeTax,
                                )}
                              </span>
                            </div>
                          )}
                          {payslipData.deductions.professionalTax > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Professional Tax
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.deductions.professionalTax,
                                )}
                              </span>
                            </div>
                          )}
                          {payslipData.deductions.providentFund > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Provident Fund
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.deductions.providentFund,
                                )}
                              </span>
                            </div>
                          )}
                          {payslipData.deductions.healthInsurance > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Health Insurance
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.deductions.healthInsurance,
                                )}
                              </span>
                            </div>
                          )}
                          {payslipData.deductions.unpaidLeaveDeduction > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Unpaid Leave
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.deductions.unpaidLeaveDeduction,
                                )}
                              </span>
                            </div>
                          )}
                          {payslipData.deductions.lateDeduction > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Late Penalty
                              </span>
                              <span>
                                {formatCurrency(
                                  payslipData.deductions.lateDeduction,
                                )}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                            <span>Total Deductions</span>
                            <span className="text-red-600">
                              {formatCurrency(
                                payslipData.deductions.totalDeductions,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Net Pay Highlight */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-80">Net Salary</p>
                          <p className="text-3xl font-bold">
                            {formatCurrency(payslipData.summary.netSalary)}
                          </p>
                        </div>
                        <CheckCircle className="h-12 w-12 opacity-50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* CSV Export Tab */}
            <TabsContent value="csv">
              <Card>
                <CardHeader>
                  <CardTitle>Export Time Entries</CardTitle>
                  <CardDescription>
                    Select a date range to export your time tracking data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quick Presets */}
                  <div>
                    <Label className="mb-2 block">Quick Select</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickDates("week")}
                      >
                        Last 7 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickDates("month")}
                      >
                        Last Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickDates("3months")}
                      >
                        Last 3 Months
                      </Button>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => initiateExport("csv")}
                    disabled={loading || !startDate || !endDate}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </>
                    )}
                  </Button>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• CSV format includes all time entry details</p>
                    <p>• Compatible with Excel and Google Sheets</p>
                    <p>• Includes work descriptions, projects, and earnings</p>
                    <p>
                      • You'll be asked to enter your PIN to export salary data
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* PIN Dialog */}
        <PinDialog
          open={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            setPendingAction(null);
          }}
          onSuccess={handlePinSuccess}
        />
      </Motion>
    </MotionProvider>
  );
}
