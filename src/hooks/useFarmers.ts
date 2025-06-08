
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Farmer {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  state?: string;
  district?: string;
  village?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  profile_photo?: string;
  date_joined: string;
  products?: any[];
  transactions?: any[];
}

export const useFarmers = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('farmers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching farmers:', error);
        toast({
          title: "Error",
          description: "Failed to load farmers",
          variant: "destructive"
        });
        return;
      }

      const formattedFarmers = data?.map(farmer => ({
        id: farmer.id,
        name: farmer.name,
        email: farmer.email,
        phone: farmer.phone,
        password: farmer.password,
        address: farmer.address,
        state: farmer.state,
        district: farmer.district,
        village: farmer.village,
        bank_name: farmer.bank_name,
        account_number: farmer.account_number,
        ifsc_code: farmer.ifsc_code,
        profile_photo: farmer.profile_photo,
        date_joined: farmer.date_joined,
        products: [],
        transactions: []
      })) || [];

      setFarmers(formattedFarmers);
    } catch (error) {
      console.error('Error in fetchFarmers:', error);
      toast({
        title: "Error",
        description: "Failed to load farmers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addFarmer = async (farmerData: Omit<Farmer, 'id' | 'date_joined' | 'products' | 'transactions'>) => {
    try {
      const { data, error } = await supabase
        .from('farmers')
        .insert([{
          name: farmerData.name,
          email: farmerData.email,
          phone: farmerData.phone,
          password: farmerData.password,
          address: farmerData.address,
          state: farmerData.state,
          district: farmerData.district,
          village: farmerData.village,
          bank_name: farmerData.bank_name,
          account_number: farmerData.account_number,
          ifsc_code: farmerData.ifsc_code,
          profile_photo: farmerData.profile_photo
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding farmer:', error);
        toast({
          title: "Error",
          description: "Failed to add farmer",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchFarmers();
      toast({
        title: "Success",
        description: `${farmerData.name} was successfully added`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in addFarmer:', error);
      toast({
        title: "Error",
        description: "Failed to add farmer",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateFarmer = async (id: string, farmerData: Partial<Farmer>) => {
    try {
      const { data, error } = await supabase
        .from('farmers')
        .update({
          name: farmerData.name,
          email: farmerData.email,
          phone: farmerData.phone,
          password: farmerData.password,
          address: farmerData.address,
          state: farmerData.state,
          district: farmerData.district,
          village: farmerData.village,
          bank_name: farmerData.bank_name,
          account_number: farmerData.account_number,
          ifsc_code: farmerData.ifsc_code,
          profile_photo: farmerData.profile_photo
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating farmer:', error);
        toast({
          title: "Error",
          description: "Failed to update farmer",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchFarmers();
      toast({
        title: "Success",
        description: `${farmerData.name}'s information was successfully updated`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in updateFarmer:', error);
      toast({
        title: "Error",
        description: "Failed to update farmer",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteFarmer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('farmers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting farmer:', error);
        toast({
          title: "Error",
          description: "Failed to delete farmer",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchFarmers();
      toast({
        title: "Success",
        description: "Farmer has been deleted successfully"
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteFarmer:', error);
      toast({
        title: "Error",
        description: "Failed to delete farmer",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  return {
    farmers,
    loading,
    fetchFarmers,
    addFarmer,
    updateFarmer,
    deleteFarmer
  };
};
