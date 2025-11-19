import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";

interface PinVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedPin: string;
  onSuccess: () => void;
  orderNumber: string;
}

export const PinVerificationModal = ({ 
  open, 
  onOpenChange, 
  expectedPin, 
  onSuccess, 
  orderNumber 
}: PinVerificationModalProps) => {
  const [enteredPin, setEnteredPin] = useState("");
  const [error, setError] = useState("");

  const handleNumberClick = (number: string) => {
    if (enteredPin.length < 4) {
      setEnteredPin(prev => prev + number);
      setError("");
    }
  };

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
      setError("PIN does not match. Please try again.");
      setEnteredPin("");
    }
  };

  const handleDelete = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Enter Pickup PIN</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Order #{orderNumber}
            </p>
            <p className="text-sm">Enter the 4-digit PIN provided by the seller</p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="w-12 h-12 border-2 border-muted rounded-lg flex items-center justify-center text-xl font-bold"
              >
                {enteredPin[index] ? "●" : ""}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
              <Button
                key={number}
                variant="outline"
                size="lg"
                onClick={() => handleNumberClick(number.toString())}
                className="h-12 text-lg font-semibold"
              >
                {number}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              onClick={handleClear}
              className="h-12 text-sm"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleNumberClick("0")}
              className="h-12 text-lg font-semibold"
            >
              0
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDelete}
              className="h-12 text-sm"
            >
              ←
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
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
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Verify PIN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};