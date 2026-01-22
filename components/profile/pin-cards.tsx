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
import { Lock } from "lucide-react";

interface PinSetupCardProps {
  newPin: string;
  setNewPin: (pin: string) => void;
  confirmPin: string;
  setConfirmPin: (pin: string) => void;
}

export function PinSetupCard({
  newPin,
  setNewPin,
  confirmPin,
  setConfirmPin,
}: PinSetupCardProps) {
  return (
    <Card
      className={!newPin || newPin !== confirmPin ? "border-amber-500" : ""}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔒 Security PIN Setup
          <span className="text-sm text-destructive">*Required</span>
        </CardTitle>
        <CardDescription>
          Set a 4-digit PIN to protect your salary information. You&apos;ll need
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
              onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))}
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
                confirmPin && newPin !== confirmPin ? "border-destructive" : ""
              }
            />
            {confirmPin && newPin !== confirmPin && (
              <p className="text-sm text-destructive mt-1">PINs do not match</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PinManagementCardProps {
  showPinUpdate: boolean;
  setShowPinUpdate: (show: boolean) => void;
  oldPin: string;
  setOldPin: (pin: string) => void;
  newPin: string;
  setNewPin: (pin: string) => void;
  confirmPin: string;
  setConfirmPin: (pin: string) => void;
  updatingPin: boolean;
  onUpdatePin: (e: React.FormEvent) => Promise<void>;
}

export function PinManagementCard({
  showPinUpdate,
  setShowPinUpdate,
  oldPin,
  setOldPin,
  newPin,
  setNewPin,
  confirmPin,
  setConfirmPin,
  updatingPin,
  onUpdatePin,
}: PinManagementCardProps) {
  return (
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
          <form onSubmit={onUpdatePin} className="space-y-4">
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
  );
}
