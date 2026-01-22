"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import type { PaymentConfig } from "@/lib/types";

interface CurrencyLocaleCardProps {
  paymentConfig: PaymentConfig;
  updatePaymentConfig: (path: string, value: unknown) => void;
}

export function CurrencyLocaleCard({
  paymentConfig,
  updatePaymentConfig,
}: CurrencyLocaleCardProps) {
  return (
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
                <SelectItem value="AUD">A$ AUD (Australian Dollar)</SelectItem>
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
  );
}
