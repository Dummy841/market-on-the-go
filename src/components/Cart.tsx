import { ArrowLeft, Plus, Minus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useZippyPass } from "@/hooks/useZippyPass";
import { LoginForm } from "@/components/auth/LoginForm";
import { ZippyPassModal } from "@/components/ZippyPassModal";
import { useState } from "react";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Cart = ({ isOpen, onClose }: CartProps) => {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    getTotalPrice,
    cartRestaurantName
  } = useCart();
  const { isAuthenticated, login, user, logout } = useUserAuth();
  const { hasActivePass, checkSubscription } = useZippyPass();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showZippyPassModal, setShowZippyPassModal] = useState(false);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    onClose();
    navigate('/checkout');
  };

  const handleLoginSuccess = (user: any) => {
    login(user);
    setShowLoginModal(false);
    onClose();
    navigate('/checkout');
  };

  const itemTotal = getTotalPrice();

  if (!isOpen) {
    return null;
  }

  if (cartItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-[9999] flex flex-col">
        {/* Header */}
        <div className="flex items-center p-4 border-b bg-background">
          <Button variant="ghost" size="sm" onClick={onClose} className="mr-3">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Your Cart</h1>
        </div>

        {/* Empty Cart Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
          <ShoppingBag className="h-24 w-24 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mb-6 text-center">Add some delicious items to get started</p>
          <Button onClick={onClose}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-[9999] flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onClose} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{cartRestaurantName}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* Items count */}
          <p className="text-sm text-muted-foreground mb-4">
            {cartItems.length} item{cartItems.length > 1 ? 's' : ''} in your cart
          </p>


          {/* Proceed to Checkout Button - Below restaurant name */}
          <Button 
            onClick={handleCheckout} 
            className="w-full mb-6 bg-green-600 hover:bg-green-700 text-white" 
            size="lg"
          >
            Proceed to Checkout • ₹{itemTotal}
          </Button>

          {/* Cart Items */}
          <div className="space-y-4 mb-6">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {item.item_photo_url && (
                    <img 
                      src={item.item_photo_url} 
                      alt={item.item_name} 
                      className="w-12 h-12 rounded-lg object-cover" 
                    />
                  )}
                  <div>
                    <h4 className="font-medium">{item.item_name}</h4>
                    <p className="text-sm text-muted-foreground">₹{item.seller_price}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-lg">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-medium">₹{item.seller_price * item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Summary */}
          <div className="border rounded-lg p-4 space-y-2 mb-4">
            <div className="flex justify-between font-medium">
              <span>Item Total</span>
              <span>₹{itemTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal - Rendered outside cart with higher z-index */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[10000]">
          <LoginForm
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSuccess={handleLoginSuccess}
            onRegisterRequired={() => setShowLoginModal(false)}
          />
        </div>
      )}

      {/* Zippy Pass Modal */}
      <ZippyPassModal 
        isOpen={showZippyPassModal}
        onClose={() => setShowZippyPassModal(false)}
        onSuccess={() => {
          checkSubscription();
          setShowZippyPassModal(false);
        }}
      />
    </div>
  );
};
