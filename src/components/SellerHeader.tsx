import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, Menu, ShoppingBag, TrendingUp, Power, PowerOff, Key, Wallet, Monitor, Receipt, Settings, Package, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const SellerHeader = () => {
  const { seller, logout } = useSellerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (seller) {
      setIsOnline(seller.is_online === true);
      fetchWalletBalance();
      fetchPendingCount();
    }
  }, [seller]);

  const fetchWalletBalance = async () => {
    if (!seller) return;
    try {
      const { data } = await supabase
        .from('seller_wallets')
        .select('balance')
        .eq('seller_id', seller.id)
        .single();
      setWalletBalance((data as any)?.balance || 0);
    } catch {
      setWalletBalance(0);
    }
  };

  const fetchPendingCount = useCallback(async () => {
    if (!seller) return;
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('seller_id', seller.id)
      .neq('delivery_address', 'POS - In Store')
      .in('seller_status', ['pending', 'accepted']);
    setOrderCount(data?.length || 0);
  }, [seller]);

  const handleToggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      const { error } = await supabase.from('sellers').update({
        is_online: newStatus
      }).eq('id', seller?.id);
      if (error) throw error;
      setIsOnline(newStatus);
      toast({
        title: "Status Updated",
        description: `You are now ${newStatus ? 'online' : 'offline'}`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update online status"
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/seller-login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Menu, path: '/seller-dashboard', section: null },
    { id: 'add', label: 'Add Items', icon: Plus, path: '/seller-dashboard', section: 'add' },
    { id: 'menu', label: 'My Menu', icon: Menu, path: '/seller-dashboard', section: 'menu' },
    { id: 'orders', label: 'Online Orders', icon: ShoppingBag, path: '/seller-dashboard', section: 'orders', badge: orderCount },
    { id: 'earnings', label: 'Online Earnings', icon: TrendingUp, path: '/seller-dashboard', section: 'earnings' },
    { id: 'wholesale', label: 'Shop Wholesale', icon: ShoppingBag, path: '/seller-wholesale', section: null },
    { id: 'pos', label: 'POS', icon: Monitor, path: '/seller-pos', section: null },
    { id: 'transactions', label: 'POS Transactions', icon: Receipt, path: '/seller-pos/transactions', section: null },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/seller-pos/settings', section: null },
    { id: 'wholesale-orders', label: 'My Orders', icon: Package, path: '/seller-wholesale', section: 'orders' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/seller-wallet', section: null },
  ];

  const getVisibleNavIds = (): string[] => {
    const sellerType = (seller as any)?.seller_type;
    switch (sellerType) {
      case 'both':
        return allNavItems.map(item => item.id);
      case 'online':
        return ['dashboard', 'add', 'menu', 'wholesale', 'orders', 'earnings', 'wholesale-orders', 'wallet'];
      case 'pos':
        return ['dashboard', 'add', 'menu', 'wholesale', 'wholesale-orders', 'pos', 'settings', 'transactions'];
      default:
        return ['dashboard', 'wholesale', 'wholesale-orders'];
    }
  };

  const navItems = allNavItems.filter(item => getVisibleNavIds().includes(item.id));

  const isActiveItem = (item: typeof allNavItems[0]) => {
    const path = location.pathname;
    const search = location.search;
    if (item.id === 'dashboard' && path === '/seller-dashboard' && !search) return true;
    if (item.id === 'add' && path === '/seller-dashboard' && search.includes('section=add')) return true;
    if (item.id === 'menu' && path === '/seller-dashboard' && search.includes('section=menu')) return true;
    if (item.id === 'orders' && path === '/seller-dashboard' && search.includes('section=orders')) return true;
    if (item.id === 'earnings' && path === '/seller-dashboard' && search.includes('section=earnings')) return true;
    if (item.id === 'wholesale' && path === '/seller-wholesale' && !search.includes('tab=orders')) return true;
    if (item.id === 'pos' && path === '/seller-pos' && !path.includes('/transactions') && !path.includes('/settings')) return true;
    if (item.id === 'transactions' && path === '/seller-pos/transactions') return true;
    if (item.id === 'settings' && path === '/seller-pos/settings') return true;
    if (item.id === 'wholesale-orders' && path === '/seller-wholesale' && search.includes('tab=orders')) return true;
    if (item.id === 'wallet' && path === '/seller-wallet') return true;
    return false;
  };

  const handleNavClick = (item: typeof allNavItems[0]) => {
    if (item.section) {
      if (item.path === '/seller-dashboard') {
        navigate(`${item.path}?section=${item.section}`);
      } else if (item.path === '/seller-wholesale' && item.section === 'orders') {
        navigate(`${item.path}?tab=orders`);
      }
    } else {
      navigate(item.path);
    }
    setMobileMenuOpen(false);
  };

  const showOnlineToggle = (seller as any)?.seller_type === 'online' || (seller as any)?.seller_type === 'both';

  if (!seller) return null;

  return (
    <>
      <header className="bg-card border-b border-border p-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger Menu */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="p-4 border-b border-border">
                    <h2 className="font-bold text-lg">{seller.seller_name}</h2>
                    <p className="text-sm text-muted-foreground">{seller.owner_name}</p>
                  </div>
                  <div className="py-2">
                    {navItems.map((item) => {
                      const active = isActiveItem(item);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors relative ${
                            active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <h1 className="text-lg font-bold">{seller.seller_name}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Wallet Card - only show for online or both */}
            {showOnlineToggle && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/seller-wallet')}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 hover:from-green-600 hover:to-emerald-700"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">{formatCurrency(walletBalance)}</span>
                <span className="sm:hidden">{formatCurrency(walletBalance)}</span>
              </Button>
            )}
            
            {/* Online Status Toggle - icon only, show for online/both */}
            {showOnlineToggle && (
              <Button
                variant={isOnline ? "default" : "outline"}
                size="icon"
                onClick={handleToggleOnlineStatus}
                className={isOnline ? "bg-green-500 hover:bg-green-600" : "text-destructive border-destructive"}
              >
                {isOnline ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
              </Button>
            )}

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={seller.profile_photo_url || ''} />
                    <AvatarFallback>{seller.owner_name?.charAt(0) || 'S'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop Navigation Bar */}
        {!isMobile && (
          <div className="max-w-7xl mx-auto mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const active = isActiveItem(item);
              return (
                <Button
                  key={item.id}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleNavClick(item)}
                  className={`flex items-center gap-2 relative whitespace-nowrap ${
                    active ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </header>

      <ChangePasswordModal 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword} 
      />
    </>
  );
};

export default SellerHeader;
