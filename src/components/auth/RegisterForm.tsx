import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";

interface RegisterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  initialMobile?: string;
}

export const RegisterForm = ({ isOpen, onClose, onSuccess, initialMobile }: RegisterFormProps) => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [name, setName] = useState("");
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

  // Prefill mobile when opened from "register required" flow
  useEffect(() => {
    if (isOpen && initialMobile) {
      setMobile(initialMobile);
      setStep('register');
      setOtp('');
      setResendTimer(0);
      setError("");
      isVerifyingRef.current = false;
    }
  }, [isOpen, initialMobile]);

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
          const code = otpCredential.code.slice(0, 4); // Ensure 4 digits
          setOtp(code);
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

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (otp.length === 4 && step === 'verify' && !isLoading && !isVerifyingRef.current) {
      isVerifyingRef.current = true;
      handleVerifyOtp();
    }
  }, [otp, step, isLoading]);

  const handleSendOtp = async () => {
    setError("");
    
    if (!name.trim() || !mobile.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('mobile', mobile)
        .maybeSingle();

      if (existingUser) {
        setError("Mobile number already registered. Please login instead.");
        setIsLoading(false);
        return;
      }

      // Send OTP via 2Factor
      const { data, error } = await supabase.functions.invoke('send-2factor-otp', {
        body: { mobile, action: 'register' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "OTP Sent",
          description: "Please enter the 4-digit OTP sent to your mobile",
        });
        setStep('verify');
        setResendTimer(30);
        setOtp("");
        isVerifyingRef.current = false;
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    
    if (!otp.trim()) {
      setError("Please enter the OTP");
      isVerifyingRef.current = false;
      return;
    }

    if (otp.length !== 4) {
      setError("Please enter a valid 4-digit OTP");
      isVerifyingRef.current = false;
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP via database (using mobile as sessionId)
      const { data, error } = await supabase.functions.invoke('verify-2factor-otp', {
        body: { sessionId: mobile, otp }
      });

      if (error) throw error;

      if (!data.success) {
        setError(data.error || "Invalid OTP");
        setIsLoading(false);
        isVerifyingRef.current = false;
        return;
      }

      // Create user
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          name: name,
          mobile: mobile,
          is_verified: true
        })
        .select()
        .single();

      if (userError) throw userError;

      toast({
        title: "Success",
        description: "Registration successful! You can now place orders.",
      });

      onSuccess(user);
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError(error.message || "Registration failed. Please try again.");
      isVerifyingRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-2factor-otp', {
        body: { mobile, action: 'register' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "OTP Sent",
          description: "New OTP sent to your mobile",
        });
        setResendTimer(30);
        setOtp("");
        isVerifyingRef.current = false;
      } else {
        throw new Error(data.error || 'Failed to resend OTP');
      }
    } catch (error: any) {
      setError(error.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('register');
    setName("");
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

  const handleOtpChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setOtp(numericValue);
    setError(""); // Clear error when typing
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md z-[10000] rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'register' ? 'Register' : 'Verify OTP'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step === 'register' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="flex">
                  <div className="flex items-center justify-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                    +91
                  </div>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, ''));
                      setError("");
                    }}
                    maxLength={10}
                    className="rounded-l-none"
                  />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
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
                  autoComplete="one-time-code"
                  placeholder="Enter 4-digit OTP"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  maxLength={4}
                  className="text-center text-2xl font-bold tracking-[0.5em] h-14 border-2 border-primary/30 focus:border-primary"
                  autoFocus
                />
                {error && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-sm font-semibold text-destructive">{error}</p>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setStep('register');
                    setError("");
                    setOtp("");
                    isVerifyingRef.current = false;
                  }}
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
