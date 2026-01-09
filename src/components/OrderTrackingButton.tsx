import { Package } from 'lucide-react';
import { useOrderTracking } from '@/contexts/OrderTrackingContext';
import { useState, useRef, useEffect } from 'react';

interface OrderTrackingButtonProps {
  onClick: () => void;
}

const OrderTrackingButton = ({ onClick }: OrderTrackingButtonProps) => {
  const { activeOrder, clearActiveOrder } = useOrderTracking();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [shouldHide, setShouldHide] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide after 1 minute for delivered/rejected/refunded orders
  useEffect(() => {
    if (activeOrder) {
      const isDelivered = activeOrder.status === 'delivered';
      const isRejected = activeOrder.seller_status === 'rejected' || activeOrder.status === 'rejected';
      const isRefunded = activeOrder.status === 'refunded';

      if (isDelivered || isRejected || isRefunded) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }

        hideTimerRef.current = setTimeout(() => {
          setShouldHide(true);
          clearActiveOrder();
        }, 60000); // 1 minute
      }
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [activeOrder?.status, activeOrder?.seller_status, clearActiveOrder]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
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
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    });
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
  if (!activeOrder || shouldHide) return null;

  // Get short status text
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'Placed',
      accepted: 'Accepted',
      preparing: 'Preparing',
      packed: 'Packed',
      assigned: 'Assigned',
      going_for_pickup: 'Pickup',
      picked_up: 'Picked',
      going_for_delivery: 'On Way',
      delivered: 'Delivered'
    };
    return statusMap[status] || status;
  };

  const handleButtonClick = () => {
    onClick(); // Directly open the modal
  };

  return (
    <div 
      ref={buttonRef}
      className="fixed z-50"
      style={{
        bottom: position.y === 0 ? '100px' : 'auto',
        left: position.x === 0 ? '16px' : `${position.x}px`,
        top: position.y !== 0 ? `${position.y}px` : 'auto',
        cursor: isDragging ? 'grabbing' : 'pointer',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Large circular button with status text */}
      <button
        onClick={handleButtonClick}
        className="bg-primary text-primary-foreground w-16 h-16 rounded-full shadow-xl hover:scale-105 transition-transform flex flex-col items-center justify-center gap-0.5 border-4 border-primary/20"
        style={{
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)'
        }}
      >
        <Package className="h-5 w-5" />
        <span className="text-[10px] font-semibold leading-tight text-center">
          {getStatusText(activeOrder.status)}
        </span>
      </button>
    </div>
  );
};

export default OrderTrackingButton;
