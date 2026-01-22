"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Receipt, Percent } from "lucide-react";
import type { PaymentConfig } from "@/lib/types";

interface TaxDeductionsAccordionProps {
  paymentConfig: PaymentConfig;
  updatePaymentConfig: (path: string, value: unknown) => void;
}

export function TaxDeductionsAccordion({
  paymentConfig,
  updatePaymentConfig,
}: TaxDeductionsAccordionProps) {
  return (
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
  );
}
