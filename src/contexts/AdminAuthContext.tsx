import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

const SUPERADMIN_MOBILE = "9502395261";
const STORAGE_KEY = "adminEmployee";

// On native app: persist in localStorage (survives app close, only logout clears)
// On web: use sessionStorage (auto-clears when tab closes)
const isNative = Capacitor.isNativePlatform();

const getStorage = () => (isNative ? localStorage : sessionStorage);

const saveSession = (data: AdminEmployee) => {
  const json = JSON.stringify(data);
  getStorage().setItem(STORAGE_KEY, json);
};

const loadSession = (): AdminEmployee | null => {
  const raw = getStorage().getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    getStorage().removeItem(STORAGE_KEY);
    return null;
  }
};

const clearSession = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
};

interface AdminEmployee {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  profile_photo_url: string | null;
  role: string;
  is_active: boolean;
  permissions: Record<string, Record<string, boolean>>;
}

interface AdminAuthContextType {
  admin: AdminEmployee | null;
  loading: boolean;
  login: (mobile: string, faceDescriptor: number[]) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isSuperAdmin: () => boolean;
  hasPermission: (section: string, action?: string) => boolean;
  updateProfilePhoto: (url: string) => void;
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
    setAdmin(loadSession());
    setLoading(false);
  }, []);

  const isSuperAdmin = () => admin?.mobile === SUPERADMIN_MOBILE;

  const hasPermission = (section: string, action: string = "view") => {
    if (!admin) return false;
    if (admin.mobile === SUPERADMIN_MOBILE) return true;
    return !!admin.permissions?.[section]?.[action];
  };

  const login = async (mobile: string, faceDescriptor: number[]) => {
    try {
      // Superadmin bypass: no face check required
      if (mobile === SUPERADMIN_MOBILE) {
        let { data: employee } = await supabase
          .from("admin_employees" as any)
          .select("*")
          .eq("mobile", SUPERADMIN_MOBILE)
          .maybeSingle();

        if (!employee) {
          const { data: inserted, error: insErr } = await supabase
            .from("admin_employees" as any)
            .insert({
              name: "Super Admin",
              mobile: SUPERADMIN_MOBILE,
              role: "superadmin",
              is_active: true,
              permissions: {},
            })
            .select("*")
            .single();
          if (insErr || !inserted) {
            return { success: false, error: insErr?.message || "Setup failed" };
          }
          employee = inserted;
        }

        const adminData: AdminEmployee = {
          id: (employee as any).id,
          name: (employee as any).name,
          mobile: (employee as any).mobile,
          email: (employee as any).email,
          profile_photo_url: (employee as any).profile_photo_url,
          role: (employee as any).role,
          is_active: (employee as any).is_active,
          permissions: (employee as any).permissions || {},
        };
        saveSession(adminData);
        setAdmin(adminData);
        return { success: true };
      }

      const { data: employee, error } = await supabase
        .from("admin_employees" as any)
        .select("*")
        .eq("mobile", mobile)
        .eq("is_active", true)
        .single();

      if (error || !employee) {
        return { success: false, error: "Invalid mobile number or account not found" };
      }

      const stored = (employee as any).face_descriptor as number[] | null;
      if (!stored || !Array.isArray(stored) || stored.length === 0) {
        return { success: false, error: "Face not enrolled. Contact admin." };
      }

      // Euclidean distance
      let sum = 0;
      for (let i = 0; i < stored.length; i++) {
        const d = stored[i] - (faceDescriptor[i] ?? 0);
        sum += d * d;
      }
      const distance = Math.sqrt(sum);
      if (distance > 0.55) {
        return { success: false, error: "Authentication Failed, Please Try Again" };
      }

      const adminData: AdminEmployee = {
        id: (employee as any).id,
        name: (employee as any).name,
        mobile: (employee as any).mobile,
        email: (employee as any).email,
        profile_photo_url: (employee as any).profile_photo_url,
        role: (employee as any).role,
        is_active: (employee as any).is_active,
        permissions: (employee as any).permissions || {},
      };

      saveSession(adminData);
      setAdmin(adminData);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Login failed" };
    }
  };

  const logout = () => {
    clearSession();
    setAdmin(null);
  };

  const updateProfilePhoto = (url: string) => {
    if (admin) {
      const updated = { ...admin, profile_photo_url: url };
      setAdmin(updated);
      saveSession(updated);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, isSuperAdmin, hasPermission, updateProfilePhoto }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
