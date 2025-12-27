import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserAuth } from '@/contexts/UserAuthContext';

interface ZippyPassSubscription {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export const useZippyPass = () => {
  const { user, isAuthenticated } = useUserAuth();
  const [subscription, setSubscription] = useState<ZippyPassSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActivePass, setHasActivePass] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setSubscription(null);
      setHasActivePass(false);
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('zippy_pass_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('end_date', now)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking Zippy Pass subscription:', error);
        return;
      }

      if (data) {
        setSubscription(data as ZippyPassSubscription);
        setHasActivePass(true);
      } else {
        setSubscription(null);
        setHasActivePass(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const getDaysRemaining = useCallback(() => {
    if (!subscription) return 0;
    const endDate = new Date(subscription.end_date);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [subscription]);

  return {
    subscription,
    isLoading,
    hasActivePass,
    checkSubscription,
    getDaysRemaining
  };
};
