import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderTracking } from '@/contexts/OrderTrackingContext';

const NotificationPermissionBanner = () => {
  const { notificationPermission, requestNotificationPermission, activeOrder } = useOrderTracking();
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner only if there's an active order and permission not granted
    const shouldShow = 
      activeOrder && 
      notificationPermission === 'default' && 
      !dismissed &&
      !localStorage.getItem('notification-banner-dismissed');
    
    setIsVisible(shouldShow);
  }, [activeOrder, notificationPermission, dismissed]);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setIsVisible(false);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-3 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-3 max-w-screen-lg mx-auto">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Enable notifications to get real-time updates on your order status
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleEnable}
            className="text-xs"
          >
            Enable
          </Button>
          <button 
            onClick={handleDismiss}
            className="p-1 hover:bg-primary-foreground/10 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;