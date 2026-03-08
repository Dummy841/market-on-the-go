import { useEffect, useRef } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Key, Camera, User } from "lucide-react";
import { AdminChangePasswordModal } from "@/components/AdminChangePasswordModal";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Dashboard = () => {
  const { admin, loading, logout, updateProfilePhoto } = useAdminAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !admin) {
      navigate("/admin-login", { replace: true });
    }
  }, [admin, loading, navigate]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !admin) return;
    const ext = file.name.split(".").pop();
    const path = `admin-photos/${admin.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("seller-profiles").upload(path, file);
    if (upErr) {
      toast({ title: "Upload failed", variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("seller-profiles").getPublicUrl(path);
    const photoUrl = urlData.publicUrl;
    const { error } = await supabase.from("admin_employees").update({ profile_photo_url: photoUrl, updated_at: new Date().toISOString() }).eq("id", admin.id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
    } else {
      updateProfilePhoto(photoUrl);
      toast({ title: "Profile photo updated" });
    }
    e.target.value = "";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  if (!admin) return null;

  const initials = admin.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={admin.profile_photo_url || undefined} alt={admin.name} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{admin.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" /> Update Photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                  <Key className="h-4 w-4 mr-2" /> Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { logout(); navigate("/admin-login", { replace: true }); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </header>
          <main className="flex-1 p-6 bg-background">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <AdminChangePasswordModal open={showChangePassword} onOpenChange={setShowChangePassword} employeeId={admin.id} />
    </SidebarProvider>
  );
};

export default Dashboard;
