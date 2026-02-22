import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExotelCallParams {
  from: string;
  to: string;
  orderId?: string;
  callerType: 'user' | 'delivery_partner';
}

export const useExotelCall = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const initiateCall = async ({ from, to, orderId, callerType }: ExotelCallParams) => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('exotel-click-to-call', {
        body: { from, to, orderId, callerType }
      });

      if (error) throw error;

      if (data.success) {
        const calleeName = callerType === 'user' ? 'Zippy Delivery Partner' : 'Zippy Customer';
        toast({
          title: "📞 Connecting your call...",
          description: `Connecting to ${calleeName}. You will receive a call on your phone shortly.`,
        });
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (error: any) {
      console.error('Exotel call error:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Could not connect the call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return { initiateCall, isConnecting };
};
