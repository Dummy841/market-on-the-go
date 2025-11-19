import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Plus, User, Menu, ShoppingBag, TrendingUp, Power, PowerOff, Key } from 'lucide-react';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import SellerItemsForm from '@/components/SellerItemsForm';
import MyMenu from '@/components/MyMenu';
import { SellerOrderManagement } from '@/components/SellerOrderManagement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ChangePasswordModal from '@/components/ChangePasswordModal';
const SellerDashboard = () => {
  const {
    seller,
    loading,
    logout
  } = useSellerAuth();
  const navigate = useNavigate();
  const [showItemsForm, setShowItemsForm] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (!loading && !seller) {
      navigate('/seller-login');
    }
  }, [seller, loading, navigate]);
  useEffect(() => {
    if (seller) {
      // Set initial online status from database (default to offline)
      setIsOnline(seller.is_online === true);
      // Fetch pending orders count
      fetchPendingOrdersCount();
    }
  }, [seller]);
  const fetchPendingOrdersCount = async () => {
    if (!seller) return;
    try {
        const {
          data,
          error
        } = await supabase.from('orders').select('id').eq('seller_id', seller.id).in('seller_status', ['pending', 'accepted']);
      if (error) throw error;
      setOrderCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching pending orders count:', error);
    }
  };
  const handleLogout = async () => {
    await logout();
    navigate('/seller-login');
  };
  const handleToggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      const {
        error
      } = await supabase.from('sellers').update({
        is_online: newStatus
      }).eq('id', seller?.id);
      if (error) throw error;
      setIsOnline(newStatus);
      toast({
        title: "Status Updated",
        description: `You are now ${newStatus ? 'online' : 'offline'}`
      });
    } catch (error) {
      console.error('Error updating online status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update online status"
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>;
  }
  if (!seller) {
    return null;
  }
  return <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{seller.seller_name}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant={isOnline ? "default" : "outline"} size="sm" onClick={handleToggleOnlineStatus} className="flex items-center gap-2">
              {isOnline ? <>
                  <Power className="w-4 h-4" />
                  Go Offline
                </> : <>
                  <PowerOff className="w-4 h-4" />
                  Go Online
                </>}
            </Button>
            
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={seller.profile_photo_url} />
                    <AvatarFallback>
                      {seller.owner_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card" align="end" forceMount>
                <DropdownMenuItem className="flex flex-col items-start">
                  <div className="font-medium">{seller.seller_name}</div>
                  <div className="text-sm text-muted-foreground">{seller.owner_name}</div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                  <Key className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {activeSection === 'dashboard' && <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setShowItemsForm(true)}>
                    <Plus className="w-6 h-6" />
                    <span>Add Items</span>
                  </Button>
                  
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setActiveSection('menu')}>
                    <Menu className="w-6 h-6" />
                    <span>My Menu</span>
                  </Button>
                  
                  <Button variant="outline" className="h-24 flex-col gap-2 relative" onClick={() => setActiveSection('orders')}>
                    <ShoppingBag className="w-6 h-6" />
                    <span>My Orders</span>
                    {orderCount > 0 && <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                        {orderCount}
                      </div>}
                  </Button>
                  
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setActiveSection('earnings')}>
                    <TrendingUp className="w-6 h-6" />
                    <span>My Earnings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>}
        
        {activeSection === 'menu' && <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setActiveSection('dashboard')}>
                ← Back to Dashboard
              </Button>
            </div>
            <MyMenu />
          </div>}
        
        {activeSection === 'orders' && <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setActiveSection('dashboard')}>
                ← Back to Dashboard
              </Button>
            </div>
            <SellerOrderManagement />
          </div>}
        
        {activeSection === 'earnings' && <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setActiveSection('dashboard')}>
                ← Back to Dashboard
              </Button>
            </div>
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-medium text-muted-foreground">Earnings Dashboard</h3>
                <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
              </CardContent>
            </Card>
          </div>}
      </main>

      <SellerItemsForm open={showItemsForm} onOpenChange={setShowItemsForm} onSuccess={() => {
      // Optional: Add any refresh logic here
    }} />

      {/* Change Password Modal */}
      {seller && (
        <ChangePasswordModal
          open={showChangePassword}
          onOpenChange={setShowChangePassword}
          userType="seller"
          userId={seller.id}
          currentPasswordHash={seller.password_hash || ''}
        />
      )}
    </div>;
};
export default SellerDashboard;