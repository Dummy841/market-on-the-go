import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  name: string;
  mobile: string;
  is_verified: boolean;
}

interface UserAuthContextType {
  user: User | null;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

// Generate a unique session token
const generateSessionToken = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
};

// Get device info for session tracking
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const browser = ua.match(/(Chrome|Safari|Firefox|Edge|Opera)/)?.[1] || 'Unknown';
  return `${isMobile ? 'Mobile' : 'Desktop'} - ${browser}`;
};

export const UserAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session validity on mount and periodically
  const validateSession = useCallback(async () => {
    const storedUser = localStorage.getItem('user');
    const sessionToken = localStorage.getItem('session_token');

    if (!storedUser || !sessionToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = JSON.parse(storedUser);

      // Check if session is still active in database
      const { data: sessionData, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userData.id)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !sessionData) {
        // Session is no longer valid (logged in from another device)
        localStorage.removeItem('user');
        localStorage.removeItem('session_token');
        setUser(null);
      } else {
        // Update last active timestamp
        await supabase
          .from('user_sessions')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', sessionData.id);
        
        setUser(userData);
      }
    } catch (error) {
      console.error('Error validating session:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('session_token');
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    validateSession();

    // Periodically check session validity (every 30 seconds)
    const interval = setInterval(validateSession, 30000);

    return () => clearInterval(interval);
  }, [validateSession]);

  const login = async (userData: User) => {
    try {
      // Invalidate all previous sessions for this user (single device login)
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', userData.id);

      // Create new session
      const sessionToken = generateSessionToken();
      const deviceInfo = getDeviceInfo();

      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userData.id,
          session_token: sessionToken,
          device_info: deviceInfo,
          is_active: true
        });

      if (error) throw error;

      // Store in localStorage
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('session_token', sessionToken);
    } catch (error) {
      console.error('Error creating session:', error);
      // Still allow login even if session tracking fails
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    }

    // Dispatch addressChanged event to refresh location-based data (e.g., sellers)
    const storedAddress = localStorage.getItem('selectedAddress');
    if (storedAddress) {
      try {
        const parsed = JSON.parse(storedAddress);
        if (parsed?.latitude != null && parsed?.longitude != null) {
          window.dispatchEvent(new CustomEvent('addressChanged', {
            detail: { latitude: parsed.latitude, longitude: parsed.longitude }
          }));
        }
      } catch (e) {
        // ignore parse error
      }
    } else {
      // Fallback to currentLat/Lng
      const lat = localStorage.getItem('currentLat');
      const lng = localStorage.getItem('currentLng');
      if (lat && lng) {
        window.dispatchEvent(new CustomEvent('addressChanged', {
          detail: { latitude: parseFloat(lat), longitude: parseFloat(lng) }
        }));
      }
    }
  };

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      
      if (sessionToken && user) {
        // Deactivate session in database
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('session_token', sessionToken);
      }
    } catch (error) {
      console.error('Error deactivating session:', error);
    }

    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('session_token');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading
  };

  return (
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
};
