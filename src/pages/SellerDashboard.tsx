import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Plus, User, Menu, ShoppingBag, TrendingUp, Power, PowerOff, Key, Wallet } from 'lucide-react';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import SellerItemsForm from '@/components/SellerItemsForm';
import MyMenu from '@/components/MyMenu';
import SellerEarningsDashboard from '@/components/SellerEarningsDashboard';
import { SellerOrderManagement } from '@/components/SellerOrderManagement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ChangePasswordModal from '@/components/ChangePasswordModal';

// Create a persistent audio element for background tab support
let dashboardNotificationAudio: HTMLAudioElement | null = null;
let dashboardAudioIntervalId: NodeJS.Timeout | null = null;
const dashboardRingingOrderIds = new Set<string>();

// Generate notification sound as data URL (works in background tabs)
const generateNotificationDataUrl = (): string => {
  const sampleRate = 24000;
  const duration = 2;
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const frequencies = [
    { freq: 784, start: 0, end: 0.15 },
    { freq: 880, start: 0.15, end: 0.3 },
    { freq: 988, start: 0.3, end: 0.45 },
    { freq: 1047, start: 0.45, end: 0.65 },
    { freq: 988, start: 0.75, end: 0.87 },
    { freq: 1047, start: 0.87, end: 0.99 },
    { freq: 1175, start: 0.99, end: 1.11 },
    { freq: 1319, start: 1.11, end: 1.36 },
    { freq: 1047, start: 1.45, end: 1.57 },
    { freq: 1319, start: 1.57, end: 1.69 },
    { freq: 1568, start: 1.69, end: 1.99 }
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const tone of frequencies) {
      if (t >= tone.start && t < tone.end) {
        const toneT = t - tone.start;
        const toneDuration = tone.end - tone.start;
        const envelope = Math.min(toneT / 0.02, 1) * Math.min((toneDuration - toneT) / 0.02, 1);
        sample = Math.sin(2 * Math.PI * tone.freq * t) * 0.5 * envelope;
        break;
      }
    }
    const int16Sample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    view.setInt16(44 + i * 2, int16Sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

const getDashboardNotificationAudio = (): HTMLAudioElement => {
  if (!dashboardNotificationAudio) {
    dashboardNotificationAudio = new Audio(generateNotificationDataUrl());
    dashboardNotificationAudio.volume = 1;
  }
  return dashboardNotificationAudio;
};

const startDashboardRinging = (orderId: string) => {
  dashboardRingingOrderIds.add(orderId);
  console.log('Dashboard: Started ringing for order:', orderId);
  if (dashboardAudioIntervalId) return;

  const audio = getDashboardNotificationAudio();
  const playSound = () => {
    if (dashboardRingingOrderIds.size === 0) {
      if (dashboardAudioIntervalId) {
        clearInterval(dashboardAudioIntervalId);
        dashboardAudioIntervalId = null;
      }
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(err => console.log('Audio play error:', err));
  };

  playSound();
  dashboardAudioIntervalId = setInterval(playSound, 3000);
};

const stopDashboardRinging = (orderId: string) => {
  dashboardRingingOrderIds.delete(orderId);
  console.log('Dashboard: Stopped ringing for order:', orderId);
  if (dashboardRingingOrderIds.size === 0 && dashboardAudioIntervalId) {
    clearInterval(dashboardAudioIntervalId);
    dashboardAudioIntervalId = null;
    if (dashboardNotificationAudio) {
      dashboardNotificationAudio.pause();
      dashboardNotificationAudio.currentTime = 0;
    }
  }
};

const stopAllDashboardRinging = () => {
  dashboardRingingOrderIds.clear();
  if (dashboardAudioIntervalId) {
    clearInterval(dashboardAudioIntervalId);
    dashboardAudioIntervalId = null;
  }
  if (dashboardNotificationAudio) {
    dashboardNotificationAudio.pause();
    dashboardNotificationAudio.currentTime = 0;
  }
};

const SellerDashboard = () => {
  const { seller, loading, logout } = useSellerAuth();
  const navigate = useNavigate();
  const [showItemsForm, setShowItemsForm] = useState(false);
  const [activeSection, setActiveSection] = useState('orders');
  const [isOnline, setIsOnline] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const processedOrderIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !seller) {
      navigate('/seller-login');
    }
  }, [seller, loading, navigate]);

  useEffect(() => {
    if (seller) {
      setIsOnline(seller.is_online === true);
      fetchPendingOrdersCount();
      fetchWalletBalance();
    }
  }, [seller]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllDashboardRinging();
    };
  }, []);

  const fetchWalletBalance = async () => {
    if (!seller) return;
    try {
      const { data, error } = await supabase
        .from('seller_wallets' as any)
        .select('balance')
        .eq('seller_id', seller.id)
        .single();

      if (error) {
        console.log('Wallet may not exist yet:', error);
        setWalletBalance(0);
      } else {
        setWalletBalance((data as any)?.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    }
  };

  const fetchPendingOrdersCount = async () => {
    if (!seller) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, seller_status')
        .eq('seller_id', seller.id)
        .in('seller_status', ['pending', 'accepted']);
      
      if (error) throw error;
      setOrderCount(data?.length || 0);

      // Start ringing for existing pending orders
      data?.forEach(order => {
        if (order.seller_status === 'pending' && !processedOrderIdsRef.current.has(order.id)) {
          processedOrderIdsRef.current.add(order.id);
          previousOrderIdsRef.current.add(order.id);
          startDashboardRinging(order.id);
        } else {
          previousOrderIdsRef.current.add(order.id);
        }
      });
    } catch (error) {
      console.error('Error fetching pending orders count:', error);
    }
  };

  // Real-time subscription for new orders on main dashboard
  useEffect(() => {
    if (!seller) return;

    console.log('Dashboard: Setting up real-time subscription for seller:', seller.id);
    
    const channel = supabase
      .channel('dashboard-orders-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${seller.id}`
      }, payload => {
        console.log('Dashboard: New order received:', payload);
        const newOrder = payload.new as any;

        if (!previousOrderIdsRef.current.has(newOrder.id)) {
          previousOrderIdsRef.current.add(newOrder.id);
          
          // Update order count
          setOrderCount(prev => prev + 1);

          // Start ringing for pending order
          if (newOrder.seller_status === 'pending') {
            processedOrderIdsRef.current.add(newOrder.id);
            startDashboardRinging(newOrder.id);
          }

          // Show toast notification
          toast({
            title: "🔔 New Order Received!",
            description: `Order #${newOrder.id.slice(-4)} - ₹${newOrder.total_amount}. Go to My Orders to accept.`,
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${seller.id}`
      }, payload => {
        console.log('Dashboard: Order updated:', payload);
        const updatedOrder = payload.new as any;

        // Stop ringing if order is no longer pending
        if (updatedOrder.seller_status !== 'pending') {
          stopDashboardRinging(updatedOrder.id);
        }

        // Update order count
        fetchPendingOrdersCount();
      })
      .subscribe(status => {
        console.log('Dashboard: Subscription status:', status);
      });

    return () => {
      console.log('Dashboard: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [seller, toast]);

  const handleLogout = async () => {
    await logout();
    navigate('/seller-login');
  };

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
      console.error('Error updating online status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update online status"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const navItems = [
    { id: 'add', label: 'Add Items', icon: Plus, action: () => setShowItemsForm(true) },
    { id: 'menu', label: 'My Menu', icon: Menu, action: () => setActiveSection('menu') },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag, action: () => setActiveSection('orders'), badge: orderCount },
    { id: 'earnings', label: 'My Earnings', icon: TrendingUp, action: () => setActiveSection('earnings') },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">{seller.seller_name}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Wallet Card */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/seller-wallet')}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 hover:from-green-600 hover:to-emerald-700"
            >
              <Wallet className="w-4 h-4" />
              <span className="font-semibold">{formatCurrency(walletBalance)}</span>
            </Button>

            <Button 
              variant={isOnline ? "default" : "outline"} 
              size="sm" 
              onClick={handleToggleOnlineStatus} 
              className="flex items-center gap-2"
            >
              {isOnline ? (
                <>
                  <Power className="w-4 h-4" />
                  Go Offline
                </>
              ) : (
                <>
                  <PowerOff className="w-4 h-4" />
                  Go Online
                </>
              )}
            </Button>
            
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
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

      {/* Compact Navigation Buttons - Always Visible */}
      <div className="bg-card border-b border-border px-3 py-2">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeSection === item.id || (item.id === 'add' && showItemsForm);
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={item.action}
                className={`flex items-center gap-2 relative whitespace-nowrap ${
                  isActive ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {activeSection === 'menu' && <MyMenu />}
        {activeSection === 'orders' && <SellerOrderManagement />}
        {activeSection === 'earnings' && <SellerEarningsDashboard />}
      </main>

      <SellerItemsForm 
        open={showItemsForm} 
        onOpenChange={setShowItemsForm} 
        onSuccess={() => {}} 
      />

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
    </div>
  );
};

export default SellerDashboard;