
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expiry_date: string;
  is_active: boolean;
  max_discount_limit: number | null;
  target_type: string;
  target_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching coupons:', error);
        toast({
          title: "Error",
          description: "Failed to load coupons",
          variant: "destructive"
        });
        return;
      }

      setCoupons(data || []);
    } catch (error) {
      console.error('Error in fetchCoupons:', error);
      toast({
        title: "Error",
        description: "Failed to load coupons",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert([couponData])
        .select()
        .single();

      if (error) {
        console.error('Error adding coupon:', error);
        toast({
          title: "Error",
          description: "Failed to add coupon",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchCoupons();
      toast({
        title: "Success",
        description: `Coupon ${couponData.code} was successfully added`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in addCoupon:', error);
      toast({
        title: "Error",
        description: "Failed to add coupon",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateCoupon = async (id: string, couponData: Partial<Coupon>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .update(couponData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating coupon:', error);
        toast({
          title: "Error",
          description: "Failed to update coupon",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchCoupons();
      toast({
        title: "Success",
        description: "Coupon was successfully updated"
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in updateCoupon:', error);
      toast({
        title: "Error",
        description: "Failed to update coupon",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting coupon:', error);
        toast({
          title: "Error",
          description: "Failed to delete coupon",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchCoupons();
      toast({
        title: "Success",
        description: "Coupon has been deleted successfully"
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteCoupon:', error);
      toast({
        title: "Error",
        description: "Failed to delete coupon",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  return {
    coupons,
    loading,
    fetchCoupons,
    addCoupon,
    updateCoupon,
    deleteCoupon
  };
};
