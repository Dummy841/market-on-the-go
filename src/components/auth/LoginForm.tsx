import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";

interface LoginFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  onRegisterRequired?: (mobile: string) => void;
}

export const LoginForm = ({ isOpen, onClose, onSuccess, onRegisterRequired }: LoginFormProps) => {
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (otp.length === 4 && step === 'verify' && !isLoading && !isVerifyingRef.current) {
      isVerifyingRef.current = true;
      handleVerifyOtp();
    }
  }, [otp]);

  const handleSendOtp = async () => {
    setError("");
    if (!mobile.trim() || mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('mobile', mobile)
        .maybeSingle();

      if (!existingUser) {
        setIsLoading(false);
        toast({
          title: "User not found",
          description: "This number is not registered.",
          variant: "destructive",
        });
        onRegisterRequired?.(mobile);
        onClose();
        return;
      }

      // 2. Invoke the Renflair Send Function
      const { data, error: invokeError } = await supabase.functions.invoke('send-reinflair-otp', {
        body: { mobile }
      });

      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || 'Failed to send OTP');

      toast({
        title: "OTP Sent",
        description: "Please check your mobile for the 4-digit code.",
      });
      
      setStep('verify');
      setResendTimer(30);
      setOtp("");
      isVerifyingRef.current = false;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (otp.length !== 4) {
      setError("Please enter a 4-digit OTP");
      isVerifyingRef.current = false;
      return;
    }

    setIsLoading(true);
    try {
      // 3. Invoke the Renflair Verify Function
      // Note: We send 'mobile' and 'otp' to match your Edge Function logic
      const { data, error: invokeError } = await supabase.functions.invoke('verify-reinflair-otp', {
        body: { mobile, otp }
      });

      if (invokeError) throw invokeError;
      if (!data?.success) {
        setError(data?.error || "Invalid OTP. Please try again.");
        setIsLoading(false);
        isVerifyingRef.current = false;
        return;
      }

      // 4. Verification success - fetch full user record
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .single();

      if (userError) throw userError;

      toast({ title: "Success", description: "Logged in successfully!" });
      onSuccess(user);
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError(error.message || "Verification failed.");
      isVerifyingRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-reinflair-otp', {
        body: { mobile }
      });
      if (error || !data?.success) throw new Error(data?.error || 'Failed to resend');

      toast({ title: "OTP Resent", description: "A new code has been sent." });
      setResendTimer(30);
      setOtp("");
      isVerifyingRef.current = false;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('login');
    setMobile("");
    setOtp("");
    setResendTimer(0);
    setError("");
    isVerifyingRef.current = false;
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md z-[10000] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{step === 'login' ? 'Login' : 'Verify OTP'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step === 'login' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-sm">+91</div>
                  <Input
                    type="tel"
                    placeholder="10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    className="rounded-l-none"
                  />
                </div>
                {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3"/>{error}</p>}
              </div>
              <Button onClick={handleSendOtp} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Send OTP"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">Sent to +91 {mobile}</p>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="4-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="text-center text-2xl font-bold tracking-[0.3em]"
                autoFocus
              />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('login')} className="flex-1">Back</Button>
                <Button onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 4} className="flex-1">
                  {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify"}
                </Button>
              </div>
              <div className="text-center">
                <Button variant="link" onClick={handleResendOtp} disabled={resendTimer > 0 || isLoading}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
