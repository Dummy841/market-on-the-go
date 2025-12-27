import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Truck, Crown } from 'lucide-react';
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

export const ZippyPassModal = ({ isOpen, onClose, onSuccess }: ZippyPassModalProps) => {
  const { user } = useUserAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

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

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to purchase Zippy Pass",
        variant: "destructive"
      });
      return;
    }

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
      const { data: razorpayOrder, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: 199,
          currency: 'INR',
          receipt: `zippy_${user.id}_${Date.now()}`
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
            const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-zippy-pass-payment', {
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
          ondismiss: function() {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-orange-500" />
            Zippy Pass
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-8 w-8" />
              <span className="text-3xl font-bold">₹199</span>
            </div>
            <p className="text-orange-100">for 30 days</p>
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
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="bg-blue-500 rounded-full p-1">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-blue-800">No Small Order Fee</p>
                  <p className="text-sm text-blue-600">Order any amount, no extra charges</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button 
            onClick={handlePurchase} 
            disabled={isProcessing}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-lg"
          >
            {isProcessing ? "Processing..." : "Get Zippy Pass @ ₹199"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Valid for 30 days from purchase. Non-refundable.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
