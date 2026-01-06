import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Zap, Truck, Crown, ArrowLeft } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
declare global {
  interface Window {
    Razorpay: any;
  }
}
interface ZippyPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
export const ZippyPassModal = ({
  isOpen,
  onClose,
  onSuccess
}: ZippyPassModalProps) => {
  const {
    user,
    login
  } = useUserAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Login form state
  const [loginStep, setLoginStep] = useState<'login' | 'verify'>('login');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  useEffect(() => {
    // Check if script is already loaded
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  }, []);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);
  const handleSendOtp = async () => {
    if (!mobile.trim() || mobile.length !== 10) {
      toast({
        title: "Error",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        data: existingUser
      } = await supabase.from('users').select('id').eq('mobile', mobile).maybeSingle();
      if (!existingUser) {
        toast({
          title: "User not found",
          description: "This mobile number is not registered. Please register first.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Send OTP via MSG91 edge function
      const { data, error } = await supabase.functions.invoke('send-msg91-otp', {
        body: { mobile, action: 'zippy_pass' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "OTP Sent",
          description: "Please check your SMS for the OTP"
        });
        setLoginStep('verify');
        setResendTimer(30);
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        data: otpData,
        error: otpError
      } = await supabase.from('user_otp').select('*').eq('mobile', mobile).eq('otp_code', otp).eq('is_used', false).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (otpError || !otpData) {
        toast({
          title: "Error",
          description: "Invalid or expired OTP",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      await supabase.from('user_otp').update({
        is_used: true
      }).eq('id', otpData.id);
      const {
        data: userData,
        error: userError
      } = await supabase.from('users').select('*').eq('mobile', mobile).single();
      if (userError) throw userError;
      toast({
        title: "Success",
        description: "Login successful!"
      });
      login(userData);
      setMobile('');
      setOtp('');
      setLoginStep('login');
    } catch (error) {
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      // Send OTP via MSG91 edge function
      const { data, error } = await supabase.functions.invoke('send-msg91-otp', {
        body: { mobile, action: 'zippy_pass' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "OTP Resent",
          description: "Please check your SMS for the new OTP"
        });
        setResendTimer(30);
      } else {
        throw new Error(data.error || 'Failed to resend OTP');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handlePurchase = async () => {
    if (!user) return;
    if (!razorpayLoaded) {
      toast({
        title: "Loading...",
        description: "Payment gateway is loading. Please try again.",
        variant: "destructive"
      });
      return;
    }
    setIsProcessing(true);
    try {
      // Create Razorpay order
      const {
        data: razorpayOrder,
        error: orderError
      } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: 199,
          currency: 'INR',
          receipt: `zp_${user.id.slice(0, 8)}_${Date.now()}`
        }
      });
      if (orderError || !razorpayOrder) {
        throw new Error(orderError?.message || 'Failed to create payment order');
      }

      // Open Razorpay checkout
      const options = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Zippy Pass',
        description: '30 Days Free Delivery',
        order_id: razorpayOrder.order_id,
        handler: async function (response: any) {
          try {
            // Verify payment
            const {
              data: verifyResult,
              error: verifyError
            } = await supabase.functions.invoke('verify-zippy-pass-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                user_id: user.id
              }
            });
            if (verifyError || !verifyResult?.success) {
              throw new Error(verifyError?.message || verifyResult?.error || 'Payment verification failed');
            }
            toast({
              title: "Zippy Pass Activated! 🎉",
              description: "Enjoy free delivery for the next 30 days!"
            });
            onSuccess();
            onClose();
          } catch (error: any) {
            console.error('Error verifying payment:', error);
            toast({
              title: "Payment Verification Failed",
              description: error.message || "Please contact support.",
              variant: "destructive"
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user.name,
          contact: user.mobile
        },
        theme: {
          color: '#f97316'
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          }
        }
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-orange-500" />
            Zippy Pass
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Login Form - Show if not logged in */}
          {!user ? <div className="space-y-4">
              <div className="bg-orange-500 rounded-xl p-4 text-white">
                <p className="font-bold">for 30 days 
OR 
Order above 499 to get Free Delivary</p>
                <p className="text-sm text-orange-100">Please login to purchase Zippy Pass</p>
              </div>
              
              {loginStep === 'login' ? <>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input id="mobile" type="tel" placeholder="Enter your mobile number" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10} />
                  </div>
                  <Button onClick={handleSendOtp} disabled={isLoading} className="w-full bg-orange-500 hover:bg-orange-600">
                    {isLoading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </> : <>
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input id="otp" type="text" placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setLoginStep('login')} className="flex-1">
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Button onClick={handleVerifyOtp} disabled={isLoading} className="flex-1 bg-orange-500 hover:bg-orange-600">
                      {isLoading ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </div>
                  <div className="text-center">
                    <Button variant="link" onClick={handleResendOtp} disabled={resendTimer > 0 || isLoading} className="text-sm text-orange-500">
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                    </Button>
                  </div>
                </>}
            </div> : <>
              {/* Hero Section */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-8 w-8" />
                  <span className="text-3xl font-bold">₹199</span>
                </div>
                <p className="text-orange-100">for 30 days
OR
Order above 499 to get Free Delivary</p>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Benefits:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="bg-green-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Free Delivery</p>
                      <p className="text-sm text-green-600">₹0 delivery fee on all orders</p>
                    </div>
                  </div>
                  
                </div>
              </div>

              {/* CTA */}
              <Button onClick={handlePurchase} disabled={isProcessing} className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-lg">
                {isProcessing ? "Processing..." : "Get Zippy Pass @ ₹199"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Valid for 30 days from purchase. Non-refundable.
              </p>
            </>}
        </div>
      </DialogContent>
    </Dialog>;
};