import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Plus, ShoppingBag, TrendingUp, Monitor, Receipt, Settings, Package, Wallet } from 'lucide-react';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { supabase } from '@/integrations/supabase/client';

const SellerHamburgerMenu = () => {
  const { seller } = useSellerAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

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

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  if (!seller) return null;

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Menu, action: () => navigate('/seller-dashboard') },
    { id: 'add', label: 'Add Items', icon: Plus, action: () => navigate('/seller-dashboard?section=add') },
    { id: 'menu', label: 'My Menu', icon: Menu, action: () => navigate('/seller-dashboard?section=menu') },
    { id: 'orders', label: 'Online Orders', icon: ShoppingBag, action: () => navigate('/seller-dashboard?section=orders'), badge: orderCount },
    { id: 'earnings', label: 'Online Earnings', icon: TrendingUp, action: () => navigate('/seller-dashboard?section=earnings') },
    { id: 'wholesale', label: 'Shop Wholesale', icon: ShoppingBag, action: () => navigate('/seller-wholesale') },
    { id: 'pos', label: 'POS', icon: Monitor, action: () => navigate('/seller-pos') },
    { id: 'transactions', label: 'POS Transactions', icon: Receipt, action: () => navigate('/seller-pos/transactions') },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => navigate('/seller-pos/settings') },
    { id: 'wholesale-orders', label: 'My Orders', icon: Package, action: () => navigate('/seller-wholesale?tab=orders') },
    { id: 'wallet', label: 'Wallet', icon: Wallet, action: () => navigate('/seller-wallet') },
  ];

  const getVisibleNavIds = (): string[] => {
    const sellerType = (seller as any)?.seller_type;
    switch (sellerType) {
      case 'both':
        return allNavItems.map(item => item.id);
      case 'online':
        return ['dashboard', 'add', 'menu', 'wholesale', 'orders', 'wholesale-orders', 'wallet'];
      case 'pos':
        return ['dashboard', 'add', 'menu', 'wholesale', 'wholesale-orders', 'pos', 'settings', 'transactions'];
      default:
        return ['dashboard', 'wholesale', 'wholesale-orders'];
    }
  };

  const navItems = allNavItems.filter(item => getVisibleNavIds().includes(item.id));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { item.action(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SellerHamburgerMenu;
