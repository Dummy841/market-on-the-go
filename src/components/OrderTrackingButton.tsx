import { Package, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderTracking } from '@/contexts/OrderTrackingContext';
import { useState, useRef, useEffect } from 'react';

interface OrderTrackingButtonProps {
  onClick: () => void;
}

const OrderTrackingButton = ({ onClick }: OrderTrackingButtonProps) => {
  const { activeOrder } = useOrderTracking();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - (buttonRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (buttonRef.current?.offsetHeight || 0);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      const maxX = window.innerWidth - (buttonRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (buttonRef.current?.offsetHeight || 0);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragStart]);

  // Early return after all hooks
  if (!activeOrder) return null;

  // Helper functions that use activeOrder - moved here after null check
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'Order Placed',
      accepted: 'Order Accepted',
      preparing: 'Preparing Order',
      packed: 'Order Packed',
      assigned: 'Partner Assigned',
      going_for_pickup: 'Going for Pickup',
      picked_up: 'Order Picked Up',
      going_for_delivery: 'Out for Delivery',
      delivered: 'Delivered'
    };
    return statusMap[status] || status;
  };

  const getEstimatedDeliveryTime = () => {
    if (activeOrder.status === 'delivered' && activeOrder.delivered_at) {
      const deliveredAt = new Date(activeOrder.delivered_at);
      const now = new Date();
      const diffInMinutes = Math.ceil((now.getTime() - deliveredAt.getTime()) / 60000);
      return `${diffInMinutes} min ago`;
    }
    
    const createdAt = new Date(activeOrder.created_at);
    const estimatedTime = new Date(createdAt.getTime() + 30 * 60000); // 30 minutes
    const now = new Date();
    const diffInMinutes = Math.ceil((estimatedTime.getTime() - now.getTime()) / 60000);
    
    if (diffInMinutes <= 0) {
      return 'Arriving soon';
    }
    return `${diffInMinutes} min`;
  };

  const items = Array.isArray(activeOrder.items) ? activeOrder.items : [];

  return (
    <div 
      ref={buttonRef}
      className="fixed z-50 bg-background border shadow-lg rounded-2xl overflow-hidden"
      style={{
        bottom: position.y === 0 ? '80px' : 'auto',
        left: position.x === 0 ? '16px' : `${position.x}px`,
        right: position.x === 0 ? '16px' : 'auto',
        top: position.y !== 0 ? `${position.y}px` : 'auto',
        cursor: isDragging ? 'grabbing' : 'default',
        maxWidth: '400px'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-accent/50 rounded">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="bg-primary/10 p-2 rounded-full">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <button
          onClick={onClick}
          className="flex-1 text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-sm">{getStatusText(activeOrder.status)}</p>
            <ChevronUp className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">
            {activeOrder.seller_name} • {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
          <p className="text-xs text-orange-600 font-medium mt-1">
            {activeOrder.status === 'delivered' ? 'Delivered: ' : 'Est. delivery: '}{getEstimatedDeliveryTime()}
          </p>
        </button>
      </div>
    </div>
  );
};

export default OrderTrackingButton;
