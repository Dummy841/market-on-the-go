import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminEmployee {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  profile_photo_url: string | null;
  role: string;
  is_active: boolean;
}

interface AdminAuthContextType {
  admin: AdminEmployee | null;
  loading: boolean;
  login: (mobile: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
};

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<AdminEmployee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("adminEmployee");
    if (stored) {
      try {
        setAdmin(JSON.parse(stored));
      } catch {
        localStorage.removeItem("adminEmployee");
      }
    }
    setLoading(false);
  }, []);

  const login = async (mobile: string, password: string) => {
    try {
      const { data: employee, error } = await supabase
        .from("admin_employees" as any)
        .select("*")
        .eq("mobile", mobile)
        .eq("is_active", true)
        .single();

      if (error || !employee) {
        return { success: false, error: "Invalid mobile number or account not found" };
      }

      const { data: isValid } = await supabase.rpc("verify_password", {
        hash: (employee as any).password_hash,
        password,
      });

      if (!isValid) {
        return { success: false, error: "Incorrect password" };
      }

      const adminData: AdminEmployee = {
        id: (employee as any).id,
        name: (employee as any).name,
        mobile: (employee as any).mobile,
        email: (employee as any).email,
        profile_photo_url: (employee as any).profile_photo_url,
        role: (employee as any).role,
        is_active: (employee as any).is_active,
      };

      localStorage.setItem("adminEmployee", JSON.stringify(adminData));
      setAdmin(adminData);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Login failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("adminEmployee");
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
