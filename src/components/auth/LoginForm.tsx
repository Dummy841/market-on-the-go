import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
  const [sessionId, setSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Web OTP API - Auto-read SMS OTP
  useEffect(() => {
    if (step === 'verify' && 'OTPCredential' in window) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      navigator.credentials.get({
        // @ts-ignore - OTPCredential is not in TypeScript types yet
        otp: { transport: ['sms'] },
        signal
      }).then((otpCredential: any) => {
        if (otpCredential && otpCredential.code) {
          setOtp(otpCredential.code);
          toast({
            title: "OTP Auto-filled",
            description: "OTP was automatically read from SMS",
          });
        }
      }).catch((err: any) => {
        if (err.name !== 'AbortError') {
          console.log('OTP auto-read not available:', err.message);
        }
      });
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [step, toast]);

  const handleSendOtp = async () => {
    if (!mobile.trim()) {
      toast({
        title: "Error",
        description: "Please enter your mobile number",
        variant: "destructive",
      });
      return;
    }

    if (mobile.length !== 10) {
      toast({
        title: "Error",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('mobile', mobile)
        .maybeSingle();

      if (!existingUser) {
        setIsLoading(false);
        toast({
          title: "User not found",
          description: "This mobile number is not registered. Please register first.",
          variant: "destructive",
        });
        setTimeout(() => {
          onClose();
          onRegisterRequired?.(mobile);
        }, 100);
        return;
      }

      // Send OTP via 2Factor
      const { data, error } = await supabase.functions.invoke('send-2factor-otp', {
        body: { mobile, action: 'login' }
      });

      if (error) throw error;

      if (data.success) {
        setSessionId(data.sessionId);
        toast({
          title: "OTP Sent",
          description: "Please enter the 4-digit OTP sent to your mobile",
        });
        setStep('verify');
        setResendTimer(30);
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the OTP",
        variant: "destructive",
      });
      return;
    }

    if (otp.length !== 4) {
      toast({
        title: "Error",
        description: "Please enter a valid 4-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP via 2Factor
      const { data, error } = await supabase.functions.invoke('verify-2factor-otp', {
        body: { sessionId, otp }
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Error",
          description: data.error || "Invalid OTP",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .single();

      if (userError) throw userError;

      toast({
        title: "Success",
        description: "Login successful!",
      });

      onSuccess(user);
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Error",
        description: error.message || "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-2factor-otp', {
        body: { mobile, action: 'login' }
      });

      if (error) throw error;

      if (data.success) {
        setSessionId(data.sessionId);
        toast({
          title: "OTP Sent",
          description: "New OTP sent to your mobile",
        });
        setResendTimer(30);
      } else {
        throw new Error(data.error || 'Failed to resend OTP');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('login');
    setMobile("");
    setOtp("");
    setSessionId("");
    setResendTimer(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md z-[10000] rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'login' ? 'Login' : 'Verify OTP'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step === 'login' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="flex">
                  <div className="flex items-center justify-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                    +91
                  </div>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  OTP sent to <span className="font-medium text-foreground">+91 {mobile}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 4-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  className="text-center text-2xl font-bold tracking-[0.5em] h-14 border-2 border-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setStep('login')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 4}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </div>
              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isLoading}
                  className="text-sm"
                >
                  {resendTimer > 0 
                    ? `Resend OTP in ${resendTimer}s` 
                    : "Resend OTP"
                  }
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
