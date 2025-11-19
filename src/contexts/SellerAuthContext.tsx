import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Seller {
  id: string;
  seller_id?: string;
  profile_photo_url?: string;
  owner_name: string;
  seller_name: string;
  mobile: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'inactive' | 'active';
  is_online?: boolean;
  seller_latitude?: number;
  seller_longitude?: number;
  franchise_percentage?: number;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

interface SellerAuthContextType {
  seller: Seller | null;
  loading: boolean;
  login: (mobile: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const SellerAuthContext = createContext<SellerAuthContextType | undefined>(undefined);

export const useSellerAuth = () => {
  const context = useContext(SellerAuthContext);
  if (!context) {
    throw new Error('useSellerAuth must be used within a SellerAuthProvider');
  }
  return context;
};

export const SellerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if seller is logged in from localStorage
    const sellerId = localStorage.getItem('seller_id');
    if (sellerId) {
      fetchSeller(sellerId);
    } else {
      setLoading(false);
    }
  }, []);

  const setSellerOfflineOnLogin = async (sellerId: string) => {
    try {
      await supabase
        .from('sellers')
        .update({ is_online: false })
        .eq('id', sellerId);
    } catch (error) {
      console.error('Error setting seller offline:', error);
    }
  };

  const fetchSeller = async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .maybeSingle();

      if (error) throw error;
      setSeller(data as Seller);
    } catch (error) {
      console.error('Error fetching seller:', error);
      localStorage.removeItem('seller_id');
    } finally {
      setLoading(false);
    }
  };

  const login = async (mobile: string, password: string) => {
    try {
      // Simple authentication - in production, use proper password hashing
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('mobile', mobile)
        .eq('password_hash', password) // In production, hash the password
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { error: 'Invalid credentials' };
      }

      if (data.status !== 'approved') {
        return { error: 'Your account is not approved yet' };
      }

      setSeller(data as Seller);
      localStorage.setItem('seller_id', data.id);
      // Set seller offline when they login
      await setSellerOfflineOnLogin(data.id);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login failed' };
    }
  };

  const logout = async () => {
    setSeller(null);
    localStorage.removeItem('seller_id');
  };

  return (
    <SellerAuthContext.Provider value={{ seller, loading, login, logout }}>
      {children}
    </SellerAuthContext.Provider>
  );
};