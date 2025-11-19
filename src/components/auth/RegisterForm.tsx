import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RegisterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const RegisterForm = ({ isOpen, onClose, onSuccess }: RegisterFormProps) => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (!name.trim() || !mobile.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
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
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('mobile', mobile)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Error",
          description: "Mobile number already registered. Please login instead.",
          variant: "destructive",
        });
        setIsLoading(false);
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
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Error",
        description: "Registration failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('register');
    setName("");
    setMobile("");
    setOtp("");
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
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
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
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setStep('register')}
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};