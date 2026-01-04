import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  onRegisterRequired: () => void;
}

export const LoginForm = ({ isOpen, onClose, onSuccess, onRegisterRequired }: LoginFormProps) => {
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
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
      // Abort any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Request OTP from SMS
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
        // Ignore abort errors
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
        toast({
          title: "User not found",
          description: "This mobile number is not registered. Please register first.",
          variant: "destructive",
        });
        setIsLoading(false);
        onClose();
        onRegisterRequired();
        return;
      }

      // Generate OTP and save to database
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const { error } = await supabase
        .from('user_otp')
        .insert({
          mobile: mobile,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      // In a real app, you would send SMS here
      // For demo purposes, we'll show the OTP in a toast
      toast({
        title: "OTP Sent",
        description: `Your OTP is: ${otpCode} (Valid for 5 minutes)`,
      });

      setStep('verify');
      setResendTimer(10); // 10 second countdown
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
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

    setIsLoading(true);

    try {
      // Verify OTP
      const { data: otpData, error: otpError } = await supabase
        .from('user_otp')
        .select('*')
        .eq('mobile', mobile)
        .eq('otp_code', otp)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (otpError || !otpData) {
        toast({
          title: "Error",
          description: "Invalid or expired OTP",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Mark OTP as used
      await supabase
        .from('user_otp')
        .update({ is_used: true })
        .eq('id', otpData.id);

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
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    
    try {
      // Generate new OTP and save to database
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const { error } = await supabase
        .from('user_otp')
        .insert({
          mobile: mobile,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      toast({
        title: "OTP Resent",
        description: `Your new OTP is: ${otpCode} (Valid for 5 minutes)`,
      });

      setResendTimer(10); // Reset 10 second countdown
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to resend OTP. Please try again.",
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
    setResendTimer(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={10}
                />
              </div>
              <Button 
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
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
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
              {/* Resend OTP Button */}
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