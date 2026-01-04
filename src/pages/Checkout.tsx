import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Minus, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useOrderTracking } from "@/contexts/OrderTrackingContext";
import { useZippyPass } from "@/hooks/useZippyPass";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AddressSelector from "@/components/AddressSelector";
import { LoginForm } from "@/components/auth/LoginForm";
import { ZippyPassModal } from "@/components/ZippyPassModal";
import { AddMoreItemsModal } from "@/components/AddMoreItemsModal";
import { DeliveryNotAvailableModal } from "@/components/DeliveryNotAvailableModal";
import { calculateDistance } from "@/lib/distanceUtils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const Checkout = () => {
  const {
    cartItems,
    updateQuantity,
    getTotalPrice,
    cartRestaurantName,
    cartRestaurantLatitude,
    cartRestaurantLongitude,
    clearCart
  } = useCart();
  const {
    user,
    login,
    isAuthenticated
  } = useUserAuth();
  const {
    setActiveOrder
  } = useOrderTracking();
  const { hasActivePass, checkSubscription } = useZippyPass();
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showZippyPassModal, setShowZippyPassModal] = useState(false);
  const [showAddMoreItemsModal, setShowAddMoreItemsModal] = useState(false);
  const [showDeliveryNotAvailableModal, setShowDeliveryNotAvailableModal] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    id: string;
    label: string;
    address: string;
    latitude?: number;
    longitude?: number;
    mobile?: string;
  }>({
    id: 'default',
    label: 'Home',
    address: '1, Welcome, Waltair Station Approach Road',
    latitude: 17.7172,
    longitude: 83.3150,
    mobile: user?.mobile || ''
  });

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Load user's default address
  const loadDefaultAddress = async () => {
    if (!user) return;

    const storedAddress = localStorage.getItem('selectedAddress');
    if (storedAddress) {
      try {
        const parsed = JSON.parse(storedAddress);
        const { data } = await supabase.from('user_addresses').select('*').eq('user_id', user.id).eq('label', parsed.label).eq('full_address', parsed.address).single();
        if (data) {
          setSelectedAddress({
            id: data.id,
            label: data.label,
            address: data.full_address,
            latitude: parseFloat(data.latitude.toString()),
            longitude: parseFloat(data.longitude.toString()),
            mobile: data.mobile
          });
          return;
        }
      } catch (error) {
        console.error('Error loading stored address:', error);
      }
    }

    try {
      const { data, error } = await supabase.from('user_addresses').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).single();
      if (error) throw error;
      if (data) {
        setSelectedAddress({
          id: data.id,
          label: data.label,
          address: data.full_address,
          latitude: parseFloat(data.latitude.toString()),
          longitude: parseFloat(data.longitude.toString()),
          mobile: data.mobile
        });
      }
    } catch (error) {
      console.error('No saved addresses found, using default');
    }
  };

  useEffect(() => {
    if (user) {
      loadDefaultAddress();
    }
  }, [user]);

  const itemTotal = getTotalPrice();
  
  // Calculate fees - Zippy Pass only waives delivery fee, small order fee is separate
  const smallOrderFee = itemTotal < 100 ? 10 : 0;
  const deliveryFee = hasActivePass ? 0 : (itemTotal >= 499 ? 0 : 19);
  const platformFee = Math.round(itemTotal * 0.05);
  const totalAmount = itemTotal + deliveryFee + platformFee + smallOrderFee;

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, error => {
        console.error('Error getting location:', error);
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (!user || !isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before placing order",
        variant: "destructive"
      });
      return;
    }
    if (!razorpayLoaded) {
      toast({
        title: "Loading...",
        description: "Payment gateway is loading. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsPlacingOrder(true);

      if (!userLocation) {
        getUserLocation();
      }

      const firstItem = cartItems[0];
      const orderData = {
        user_id: user.id,
        seller_id: firstItem.seller_id,
        seller_name: cartRestaurantName,
        items: cartItems.map(item => ({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          seller_price: item.seller_price
        })),
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        platform_fee: platformFee,
        delivery_address: `${selectedAddress.address}, Location: ${selectedAddress.latitude}, ${selectedAddress.longitude}`,
        delivery_latitude: selectedAddress.latitude || userLocation?.lat,
        delivery_longitude: selectedAddress.longitude || userLocation?.lng,
        delivery_mobile: selectedAddress.mobile || user?.mobile || '',
        instructions: instructions,
      };

      // Create Razorpay order
      const { data: razorpayOrder, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: totalAmount,
          currency: 'INR',
          receipt: `order_${Date.now()}`
        }
      });

      if (orderError || !razorpayOrder) {
        throw new Error(orderError?.message || 'Failed to create payment order');
      }

      console.log('Razorpay order created:', razorpayOrder);

      // Open Razorpay checkout
      const options = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Food Delivery',
        description: `Order from ${cartRestaurantName}`,
        order_id: razorpayOrder.order_id,
        handler: async function (response: any) {
          console.log('Payment successful:', response);
          
          try {
            // Verify payment and create order
            const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_data: orderData
              }
            });

            if (verifyError || !verifyResult?.success) {
              throw new Error(verifyError?.message || verifyResult?.error || 'Payment verification failed');
            }

            // Set active order for tracking
            if (verifyResult.order) {
              setActiveOrder(verifyResult.order);
            }

            clearCart();
            toast({
              title: "Order Placed Successfully!",
              description: "Your order has been placed and will be processed soon."
            });

            navigate('/');
          } catch (error: any) {
            console.error('Error verifying payment:', error);
            toast({
              title: "Payment Verification Failed",
              description: error.message || "Please contact support if amount was deducted.",
              variant: "destructive"
            });
          } finally {
            setIsPlacingOrder(false);
          }
        },
        prefill: {
          name: user.name,
          contact: user.mobile
        },
        theme: {
          color: '#16a34a'
        },
        modal: {
          ondismiss: function() {
            setIsPlacingOrder(false);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment. Please try again.",
              variant: "destructive"
            });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{cartRestaurantName}</h1>
              <p className="text-sm text-muted-foreground">{selectedAddress.address}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Cart Items */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="w-4 h-4 p-0 flex items-center justify-center">
                      🔺
                    </Badge>
                    <span className="font-medium">{item.item_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-lg">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="font-medium">₹{item.seller_price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Delivery Address</h3>
            <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowAddressSelector(true)}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">{selectedAddress.label}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {selectedAddress.address}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <Textarea placeholder="Any instructions for the restaurant or delivery partner?" value={instructions} onChange={e => setInstructions(e.target.value)} className="mt-3" />
          </CardContent>
        </Card>

        {/* Bill Summary */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Bill Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Item Total</span>
                <span>₹{itemTotal}</span>
              </div>
              {smallOrderFee > 0 && (
                <div className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-2">
                    <span>Small Order Fee</span>
                    <button 
                      onClick={() => setShowAddMoreItemsModal(true)}
                      className="text-xs text-orange-500 font-medium hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <span>₹{smallOrderFee}</span>
                </div>
              )}
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-2">
                  <span>Delivery Fee</span>
                  {!hasActivePass && deliveryFee > 0 && (
                    <button 
                      onClick={() => setShowZippyPassModal(true)}
                      className="text-xs text-orange-500 font-medium hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span className={hasActivePass ? 'text-green-600' : ''}>
                  {deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Platform Fee</span>
                <span>₹{platformFee}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>TO PAY</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>
            
            {/* Pay Button */}
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white mt-4" size="lg" onClick={handlePlaceOrder} disabled={isPlacingOrder || cartItems.length === 0}>
              {isPlacingOrder ? "Processing..." : `Pay ₹${totalAmount}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Address Selector Modal */}
      <AddressSelector open={showAddressSelector} onOpenChange={setShowAddressSelector} onAddressSelect={address => {
        // Check if address is within 10km of restaurant
        if (cartRestaurantLatitude && cartRestaurantLongitude && address.latitude && address.longitude) {
          const distance = calculateDistance(
            address.latitude,
            address.longitude,
            cartRestaurantLatitude,
            cartRestaurantLongitude
          );
          
          if (distance > 10) {
            // Show modal that restaurant doesn't deliver to this location
            setShowDeliveryNotAvailableModal(true);
            setShowAddressSelector(false);
            return;
          }
        }
        
        // Address is valid, update it
        setSelectedAddress(address);
        if (address.latitude && address.longitude) {
          setUserLocation({
            lat: address.latitude,
            lng: address.longitude
          });
        }
      }} selectedAddress={selectedAddress} />

      {/* Login Modal */}
      <LoginForm isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={userData => {
        login(userData);
        setShowLoginModal(false);
        toast({
          title: "Login Successful",
          description: "You can now place your order"
        });
      }} onRegisterRequired={() => {
        setShowLoginModal(false);
      }} />

      {/* Zippy Pass Modal */}
      <ZippyPassModal 
        isOpen={showZippyPassModal}
        onClose={() => setShowZippyPassModal(false)}
        onSuccess={() => {
          checkSubscription();
          setShowZippyPassModal(false);
        }}
      />

      {/* Add More Items Modal */}
      <AddMoreItemsModal
        isOpen={showAddMoreItemsModal}
        onClose={() => setShowAddMoreItemsModal(false)}
        sellerId={cartItems[0]?.seller_id || ''}
        sellerName={cartRestaurantName || ''}
        targetAmount={100}
        currentTotal={itemTotal}
      />

      {/* Delivery Not Available Modal */}
      <DeliveryNotAvailableModal
        isOpen={showDeliveryNotAvailableModal}
        onClose={() => setShowDeliveryNotAvailableModal(false)}
        restaurantName={cartRestaurantName || undefined}
        onViewRestaurants={() => {
          setShowDeliveryNotAvailableModal(false);
          // Navigate to restaurants page - the FeaturedRestaurants will filter by current location
          navigate('/restaurants');
        }}
      />
    </div>
  );
};
