import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package, TrendingUp, User, LogOut, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DeliveryPartnerOrders from "@/components/DeliveryPartnerOrders";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { DeliveryPartnerVoiceCallProvider } from "@/contexts/DeliveryPartnerVoiceCallContext";
interface DeliveryPartner {
  id: string;
  name: string;
  mobile: string;
  profile_photo_url?: string;
  password_hash?: string;
  is_online: boolean;
}
const DeliveryPartnerDashboard = () => {
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  useEffect(() => {
    const storedPartner = localStorage.getItem('delivery_partner');
    if (!storedPartner) {
      navigate('/delivery-login');
      return;
    }
    try {
      setPartner(JSON.parse(storedPartner));
    } catch (error) {
      console.error('Error parsing partner data:', error);
      navigate('/delivery-login');
    }
  }, [navigate]);
  const handleLogout = () => {
    localStorage.removeItem('delivery_partner');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
    navigate('/delivery-login');
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };
  if (!partner) {
    return null; // Will redirect to login
  }
  return (
    <DeliveryPartnerVoiceCallProvider partnerId={partner.id} partnerName={partner.name}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-2xl font-bold text-foreground">Delivery Dashboard</h1>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-12 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={partner.profile_photo_url} alt={partner.name} />
                    <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => setShowChangePassword(true)}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  My Earnings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Welcome back, {partner.name}!</CardTitle>
              </CardHeader>
            </Card>

            {/* Quick Stats */}
            

            {activeSection === 'dashboard' && (
              <>
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button 
                        className="h-20 flex flex-col gap-2" 
                        variant="outline"
                        onClick={() => setActiveSection('orders')}
                      >
                        <Package className="h-6 w-6" />
                        <span>My Orders</span>
                      </Button>
                      <Button className="h-20 flex flex-col gap-2" variant="outline">
                        <TrendingUp className="h-6 w-6" />
                        <span>Earnings Report</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === 'orders' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>My Orders</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveSection('dashboard')}
                    >
                      Back to Dashboard
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DeliveryPartnerOrders partnerId={partner.id} partnerName={partner.name} />
                </CardContent>
              </Card>
            )}

            {/* Status */}
            
          </div>
        </main>

        {/* Change Password Modal */}
        {partner && (
          <ChangePasswordModal
            open={showChangePassword}
            onOpenChange={setShowChangePassword}
            userType="delivery_partner"
            userId={partner.id}
            currentPasswordHash={partner.password_hash || ''}
          />
        )}
      </div>
    </DeliveryPartnerVoiceCallProvider>
  );
};
export default DeliveryPartnerDashboard;