import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle, Package } from "lucide-react";

interface DeliveryPinVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedPin: string;
  onSuccess: () => void;
  orderNumber: string;
}

export const DeliveryPinVerificationModal = ({ 
  open, 
  onOpenChange, 
  expectedPin, 
  onSuccess, 
  orderNumber 
}: DeliveryPinVerificationModalProps) => {
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState("");

  const handleClear = () => {
    setEnteredPin("");
    setError("");
  };

  const handleVerify = () => {
    if (enteredPin.trim() === String(expectedPin ?? '').trim()) {
      onSuccess();
      handleClear();
      onOpenChange(false);
    } else {
      setError("Delivery PIN doesn't match. Please check with customer.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Verify Delivery PIN
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Order #{orderNumber}
            </p>
            <p className="text-sm">
              Ask customer for their 4-digit delivery PIN to confirm delivery
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP 
              maxLength={4} 
              value={enteredPin} 
              onChange={(value) => {
                setEnteredPin(value);
                setError("");
              }}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                handleClear();
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={enteredPin.length !== 4}
              className="flex-1"
            >
              Verify & Deliver
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};