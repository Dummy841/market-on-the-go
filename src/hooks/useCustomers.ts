
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  mobile: string;
  address?: string;
  pincode?: string;
  password: string;
  profile_photo?: string;
  date_joined: string;
}

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: "Error",
          description: "Failed to load customers",
          variant: "destructive"
        });
        return;
      }

      const formattedCustomers = data?.map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        address: customer.address,
        pincode: customer.pincode,
        password: customer.password,
        profile_photo: customer.profile_photo,
        date_joined: customer.date_joined
      })) || [];

      setCustomers(formattedCustomers);
    } catch (error) {
      console.error('Error in fetchCustomers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'date_joined'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: customerData.name,
          email: customerData.email,
          mobile: customerData.mobile,
          address: customerData.address,
          pincode: customerData.pincode,
          password: customerData.password,
          profile_photo: customerData.profile_photo
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding customer:', error);
        toast({
          title: "Error",
          description: "Failed to add customer",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchCustomers();
      toast({
        title: "Success",
        description: `${customerData.name} was successfully added`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in addCustomer:', error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: customerData.name,
          email: customerData.email,
          mobile: customerData.mobile,
          address: customerData.address,
          pincode: customerData.pincode,
          password: customerData.password,
          profile_photo: customerData.profile_photo
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating customer:', error);
        toast({
          title: "Error",
          description: "Failed to update customer",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchCustomers();
      toast({
        title: "Success",
        description: `${customerData.name}'s information was successfully updated`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in updateCustomer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting customer:', error);
        toast({
          title: "Error",
          description: "Failed to delete customer",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchCustomers();
      toast({
        title: "Success",
        description: "Customer has been deleted successfully"
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteCustomer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer
  };
};
