import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import OrderTrackingButton from "@/components/OrderTrackingButton";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const CartPage = () => {
  const { cartItems, updateQuantity, getTotalPrice, getItemsBySeller, getUniqueSellers } = useCart();
  const navigate = useNavigate();
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  const itemTotal = getTotalPrice();
  const itemsBySeller = getItemsBySeller();
  const uniqueSellers = getUniqueSellers();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-[env(safe-area-inset-bottom)]">
        <Header />
        <main className="container mx-auto px-4 flex-1 flex flex-col items-center justify-center text-center">
          <ShoppingBag className="h-24 w-24 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">Add some delicious items to get started</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </main>
        <Footer />
        <OrderTrackingButton onClick={() => setShowTrackingModal(true)} />
        <OrderTrackingModal isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[env(safe-area-inset-bottom)]">
      <Header />
      <main className="container mx-auto px-4 py-6 flex-1">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <h1 className="text-2xl font-bold mb-2">Your Cart</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {cartItems.length} item{cartItems.length > 1 ? 's' : ''} from {uniqueSellers.length} seller{uniqueSellers.length > 1 ? 's' : ''}
        </p>

        <Button onClick={handleCheckout} size="lg" className="w-full mb-6" variant="food">
          Proceed to Checkout • ₹{itemTotal}
        </Button>

        {/* Cart Items grouped by seller */}
        <section className="space-y-6 mb-6">
          {uniqueSellers.map(seller => (
            <div key={seller.seller_id}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">{seller.seller_name}</h3>
              <div className="space-y-4">
                {(itemsBySeller[seller.seller_id] || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {item.item_photo_url && (
                        <img src={item.item_photo_url} alt={item.item_name} className="w-12 h-12 rounded-lg object-cover" />
                      )}
                      <div>
                        <h4 className="font-medium">{item.item_name}</h4>
                        <p className="text-sm text-muted-foreground">₹{item.seller_price}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-lg">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="font-medium">₹{item.seller_price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="border rounded-lg p-4 space-y-2 mb-24">
          <div className="flex justify-between font-medium">
            <span>Item Total</span>
            <span>₹{itemTotal}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Delivery fee, platform fee will be calculated at checkout
          </p>
        </section>
      </main>
      <Footer />
      <OrderTrackingButton onClick={() => setShowTrackingModal(true)} />
      <OrderTrackingModal isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} />
    </div>
  );
};

export default CartPage;
