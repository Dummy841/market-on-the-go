import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import zippyLogo from '@/assets/zippy-logo.png';

const SellerLogin = () => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [reusedMessage, setReusedMessage] = useState('');
  const { loginWithOtp } = useSellerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile",
        description: "Please enter a valid 10-digit mobile number",
      });
      return;
    }

    setLoading(true);

    try {
      // First check if seller exists with this mobile
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('id, status')
        .eq('mobile', mobile)
        .maybeSingle();

      if (sellerError) throw sellerError;

      if (!sellerData) {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "No seller account found with this mobile number",
        });
        setLoading(false);
        return;
      }

      if (sellerData.status !== 'approved') {
        toast({
          variant: "destructive",
          title: "Account Not Approved",
          description: "Your seller account is not approved yet",
        });
        setLoading(false);
        return;
      }

      // Send OTP using existing edge function
      const { data, error } = await supabase.functions.invoke('send-2factor-otp', {
        body: { mobile, action: 'seller_login' },
      });

      if (error) throw error;

      if (data?.success) {
        setSessionId(data.sessionId);
        setOtpSent(true);
        startResendTimer();
        if (data.reused) {
          toast({
            title: "OTP Still Active",
            description: "Your recent OTP is still valid. Please use it.",
          });
        } else {
          toast({
            title: "OTP Sent",
            description: "Please enter the 4-digit OTP sent to your mobile",
          });
        }
      } else {
        throw new Error(data?.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send OTP",
      });
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 4) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please enter the complete 4-digit OTP",
      });
      return;
    }

    setLoading(true);

    try {
      // Verify OTP using existing edge function
      const { data, error } = await supabase.functions.invoke('verify-2factor-otp', {
        body: { sessionId, otp },
      });

      if (error) throw error;

      if (data?.success) {
        // Detect device type
        const isApp = !!(window as any).Capacitor?.isNativePlatform?.();
        const deviceType = isApp ? 'app' : 'web';

        const result = await loginWithOtp(mobile, deviceType);

        if (result.error) {
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: result.error,
          });
        } else {
          navigate('/seller-dashboard');
        }
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data?.error || "Invalid or expired OTP",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to verify OTP",
      });
    }

    setLoading(false);
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (otp.length === 4 && otpSent && !loading && sessionId) {
      handleVerifyOtp({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [otp]);

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtp('');
    await handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-3">
            <img src={zippyLogo} alt="Zippy" className="h-20 w-auto object-contain" />
          </div>
          <CardTitle className="text-2xl text-center">Seller Login</CardTitle>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter your 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                OTP sent to <span className="font-semibold">{mobile}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {loading && <p className="text-center text-sm text-muted-foreground">Verifying...</p>}
              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend OTP in {resendTimer}s
                  </p>
                ) : (
                  <Button type="button" variant="link" onClick={handleResendOtp} disabled={loading}>
                    Resend OTP
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setOtpSent(false); setOtp(''); setSessionId(''); }}
              >
                Change Mobile Number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerLogin;
