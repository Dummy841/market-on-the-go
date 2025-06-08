
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  address: string | null;
  pincode: string | null;
  password: string;
  profile_photo: string | null;
  date_joined: string;
  created_at: string;
  updated_at: string;
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

      setCustomers(data || []);
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

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'date_joined' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding customer to Supabase:', customerData);
      
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
          description: `Failed to add customer: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      console.log('Customer added successfully:', data);
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
      console.log('Updating customer:', id, customerData);
      
      const updateData: any = {};
      if (customerData.name !== undefined) updateData.name = customerData.name;
      if (customerData.email !== undefined) updateData.email = customerData.email;
      if (customerData.mobile !== undefined) updateData.mobile = customerData.mobile;
      if (customerData.address !== undefined) updateData.address = customerData.address;
      if (customerData.pincode !== undefined) updateData.pincode = customerData.pincode;
      if (customerData.password !== undefined) updateData.password = customerData.password;
      if (customerData.profile_photo !== undefined) updateData.profile_photo = customerData.profile_photo;

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating customer:', error);
        toast({
          title: "Error",
          description: `Failed to update customer: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchCustomers();
      toast({
        title: "Success",
        description: `${customerData.name || 'Customer'}'s information was successfully updated`
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
          description: `Failed to delete customer: ${error.message}`,
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

  // Function to register customer and store in Supabase
  const registerCustomer = async (registrationData: {
    name: string;
    mobile: string;
    email?: string;
    address: string;
    pincode: string;
  }) => {
    try {
      console.log('Registering new customer:', registrationData);
      
      const customerData = {
        name: registrationData.name,
        mobile: registrationData.mobile,
        email: registrationData.email || null,
        address: registrationData.address,
        pincode: registrationData.pincode,
        password: 'defaultPassword123', // In a real app, this would be handled properly
        profile_photo: null
      };

      const result = await addCustomer(customerData);
      
      if (result.success) {
        console.log('Customer registration successful:', result.data);
        return { success: true, customer: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Error in registerCustomer:', error);
      return { success: false, error };
    }
  };

  // Function to login customer
  const loginCustomer = async (mobile: string) => {
    try {
      console.log('Attempting customer login for mobile:', mobile);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('mobile', mobile)
        .single();

      if (error) {
        console.error('Error during customer login:', error);
        return { success: false, error: 'Customer not found' };
      }

      console.log('Customer login successful:', data);
      return { success: true, customer: data };
    } catch (error) {
      console.error('Error in loginCustomer:', error);
      return { success: false, error: 'Login failed' };
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
    deleteCustomer,
    registerCustomer,
    loginCustomer
  };
};
