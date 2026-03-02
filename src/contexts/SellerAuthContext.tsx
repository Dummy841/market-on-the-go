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
  category?: string;
  categories?: string;
  subcategory?: string;
  seller_type?: string | null;
  created_at: string;
  updated_at: string;
}

interface SellerAuthContextType {
  seller: Seller | null;
  loading: boolean;
  login: (mobile: string, password: string) => Promise<{ error?: string }>;
  loginWithOtp: (mobile: string, deviceType: string) => Promise<{ error?: string }>;
  directLogin: (sellerData: any) => void;
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

function generateSessionToken(): string {
  return crypto.randomUUID() + '-' + Date.now();
}

export const SellerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sellerId = localStorage.getItem('seller_id');
    const sessionToken = localStorage.getItem('seller_session_token');
    if (sellerId && sessionToken) {
      validateSessionAndFetch(sellerId, sessionToken);
    } else {
      setLoading(false);
    }
  }, []);

  const validateSessionAndFetch = async (sellerId: string, sessionToken: string) => {
    try {
      // Check if session is still active
      const { data: session, error: sessionError } = await supabase
        .from('seller_sessions')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .maybeSingle();

      if (sessionError || !session) {
        // Session invalidated (logged in from another device)
        localStorage.removeItem('seller_id');
        localStorage.removeItem('seller_session_token');
        setLoading(false);
        return;
      }

      // Update last active
      await supabase
        .from('seller_sessions')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', session.id);

      await fetchSeller(sellerId);
    } catch (error) {
      console.error('Session validation error:', error);
      localStorage.removeItem('seller_id');
      localStorage.removeItem('seller_session_token');
      setLoading(false);
    }
  };

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
      localStorage.removeItem('seller_session_token');
    } finally {
      setLoading(false);
    }
  };

  const manageDeviceSessions = async (sellerId: string, deviceType: string) => {
    // Get all active sessions for this seller
    const { data: activeSessions } = await supabase
      .from('seller_sessions')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (activeSessions && activeSessions.length > 0) {
      // Deactivate existing session of same device type
      const sameTypeSessions = activeSessions.filter(s => s.device_type === deviceType);
      if (sameTypeSessions.length > 0) {
        await supabase
          .from('seller_sessions')
          .update({ is_active: false })
          .in('id', sameTypeSessions.map(s => s.id));
      }

      // Check remaining active sessions (other device type)
      const otherTypeSessions = activeSessions.filter(s => s.device_type !== deviceType);
      
      // If there's already one other device type session, that's fine (max 2: 1 app + 1 web)
      // If somehow there are more, deactivate the oldest ones
      if (otherTypeSessions.length > 1) {
        const toDeactivate = otherTypeSessions.slice(1);
        await supabase
          .from('seller_sessions')
          .update({ is_active: false })
          .in('id', toDeactivate.map(s => s.id));
      }
    }
  };

  const createSession = async (sellerId: string, deviceType: string): Promise<string> => {
    const sessionToken = generateSessionToken();
    const deviceInfo = navigator.userAgent;

    // Manage existing sessions (enforce 2 device limit)
    await manageDeviceSessions(sellerId, deviceType);

    // Create new session
    await supabase
      .from('seller_sessions')
      .insert({
        seller_id: sellerId,
        session_token: sessionToken,
        device_type: deviceType,
        device_info: deviceInfo,
        is_active: true,
      });

    return sessionToken;
  };

  const login = async (mobile: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('mobile', mobile)
        .eq('password_hash', password)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { error: 'Invalid credentials' };
      if (data.status !== 'approved') return { error: 'Your account is not approved yet' };

      const sessionToken = await createSession(data.id, 'web');
      setSeller(data as Seller);
      localStorage.setItem('seller_id', data.id);
      localStorage.setItem('seller_session_token', sessionToken);
      await setSellerOfflineOnLogin(data.id);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login failed' };
    }
  };

  const loginWithOtp = async (mobile: string, deviceType: string) => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('mobile', mobile)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { error: 'No seller found with this mobile number' };
      if (data.status !== 'approved') return { error: 'Your account is not approved yet' };

      const sessionToken = await createSession(data.id, deviceType);
      setSeller(data as Seller);
      localStorage.setItem('seller_id', data.id);
      localStorage.setItem('seller_session_token', sessionToken);
      await setSellerOfflineOnLogin(data.id);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login failed' };
    }
  };

  const directLogin = (sellerData: any) => {
    setSeller(sellerData as Seller);
    localStorage.setItem('seller_id', sellerData.id);
  };

  const logout = async () => {
    const sessionToken = localStorage.getItem('seller_session_token');
    if (sessionToken) {
      await supabase
        .from('seller_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);
    }
    setSeller(null);
    localStorage.removeItem('seller_id');
    localStorage.removeItem('seller_session_token');
  };

  return (
    <SellerAuthContext.Provider value={{ seller, loading, login, loginWithOtp, directLogin, logout }}>
      {children}
    </SellerAuthContext.Provider>
  );
};
