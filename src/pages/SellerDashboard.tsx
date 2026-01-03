import { useEffect, useState, useRef, useCallback } from 'react';
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
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const processedOrderIdsRef = useRef<Set<string>>(new Set());
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
      setIsOnline(seller.is_online === true);
      fetchPendingOrdersCount();
    }
  }, [seller]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllDashboardRinging();
    };
  }, []);

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