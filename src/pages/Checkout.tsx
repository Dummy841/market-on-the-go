import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Minus, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useOrderTracking } from "@/contexts/OrderTrackingContext";
import { useZippyPass } from "@/hooks/useZippyPass";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AddressSelector from "@/components/AddressSelector";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
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
  const { balance: walletBalance, refreshBalance } = useUserWallet();
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState("");
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerInitialMobile, setRegisterInitialMobile] = useState<string | undefined>(undefined);
  const [showZippyPassModal, setShowZippyPassModal] = useState(false);
  const [showAddMoreItemsModal, setShowAddMoreItemsModal] = useState(false);
  const [showDeliveryNotAvailableModal, setShowDeliveryNotAvailableModal] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [attemptedAddress, setAttemptedAddress] = useState<{
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<{
    id: string;
    label: string;
    address: string;
    latitude?: number;
    longitude?: number;
    mobile?: string;
  } | null>(null);

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
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedAddress({
          id: data.id,
          label: data.label,
          address: data.full_address,
          latitude: parseFloat(data.latitude.toString()),
          longitude: parseFloat(data.longitude.toString()),
          mobile: data.mobile,
        });
      } else {
        setSelectedAddress(null);
      }
    } catch {
      setSelectedAddress(null);
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
  const grossTotal = itemTotal + deliveryFee + platformFee + smallOrderFee;
  
  // Calculate wallet discount
  const walletAmountToUse = useWalletBalance ? Math.min(walletBalance, grossTotal) : 0;
  const totalAmount = grossTotal - walletAmountToUse;

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
        variant: "destructive",
      });
      return;
    }

    if (!selectedAddress) {
      toast({
        title: "Add delivery address",
        description: "Please add a delivery address to place the order.",
        variant: "destructive",
      });
      setShowAddressSelector(true);
      return;
    }

    // Only check Razorpay if we need to pay via Razorpay (totalAmount > 0)
    if (totalAmount > 0 && !razorpayLoaded) {
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
      const paymentMethod = walletAmountToUse > 0 
        ? (totalAmount > 0 ? 'razorpay+wallet' : 'wallet') 
        : 'upi';
      
        const orderData = {
          user_id: user.id,
          seller_id: firstItem.seller_id,
          seller_name: cartRestaurantName,
          items: cartItems.map((item) => ({
            id: item.id,
            item_name: item.item_name,
            quantity: item.quantity,
            seller_price: item.seller_price,
          })),
          total_amount: grossTotal, // Store gross total
          delivery_fee: deliveryFee,
          platform_fee: platformFee,
          delivery_address: `${selectedAddress!.address}, Location: ${selectedAddress!.latitude}, ${selectedAddress!.longitude}`,
          delivery_latitude: selectedAddress!.latitude ?? userLocation?.lat,
          delivery_longitude: selectedAddress!.longitude ?? userLocation?.lng,
          delivery_mobile: selectedAddress!.mobile || user?.mobile || '',
          instructions: instructions,
          payment_method: paymentMethod,
        };


      // Helper function to debit wallet and create order
      const processWalletDebit = async (): Promise<string | null> => {
        if (walletAmountToUse <= 0) return null;

        // Debit wallet
        const { error: walletUpdateError } = await supabase
          .from('user_wallets')
          .update({
            balance: walletBalance - walletAmountToUse,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (walletUpdateError) {
          console.error('Error updating wallet:', walletUpdateError);
          throw new Error('Failed to debit wallet');
        }

        // Create debit transaction (we will attach order_id once we have it)
        const { data: txnRow, error: txnError } = await supabase
          .from('user_wallet_transactions')
          .insert({
            user_id: user.id,
            type: 'debit',
            amount: walletAmountToUse,
            description: `Used for order at ${cartRestaurantName}`,
          })
          .select('id')
          .single();

        if (txnError) {
          console.error('Error creating transaction:', txnError);
          return null;
        }

        refreshBalance();
        return (txnRow as any)?.id ?? null;
      };

      // If wallet covers full amount, skip Razorpay
      if (totalAmount === 0 && walletAmountToUse > 0) {
        // Process wallet payment directly
        const walletTxnId = await processWalletDebit();

        // Create order directly
        const { data: orderResult, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) {
          throw new Error(orderError.message || 'Failed to create order');
        }

        // Attach order_id to the wallet debit transaction
        if (walletTxnId && orderResult?.id) {
          await supabase
            .from('user_wallet_transactions')
            .update({ order_id: orderResult.id })
            .eq('id', walletTxnId);
        }

        if (orderResult) {
          setActiveOrder(orderResult);
        }

        clearCart();
        toast({
          title: "Order Placed Successfully!",
          description: "Paid using wallet balance."
        });

        navigate('/');
        setIsPlacingOrder(false);
        return;
      }

      // Create Razorpay order for remaining amount
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
              // Process wallet debit if applicable
              const walletTxnId = await processWalletDebit();

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

              // Attach order_id to wallet debit transaction (if any)
              const createdOrderId = verifyResult?.order?.id;
              if (walletTxnId && createdOrderId) {
                await supabase
                  .from('user_wallet_transactions')
                  .update({ order_id: createdOrderId })
                  .eq('id', walletTxnId);
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
    <div className="min-h-screen bg-gray-50 pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{cartRestaurantName}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedAddress?.address || "Add delivery address"}
              </p>
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
            <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
              // If user is not logged in, show login modal first
              if (!isAuthenticated) {
                setShowLoginModal(true);
                return;
              }
              setShowAddressSelector(true);
            }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {selectedAddress ? selectedAddress.label : "Add Address"}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {selectedAddress ? selectedAddress.address : "Tap to add a delivery address"}
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
              
              {/* Wallet Balance Option */}
              {walletBalance > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="useWallet" 
                        checked={useWalletBalance}
                        onCheckedChange={(checked) => setUseWalletBalance(checked === true)}
                      />
                      <label htmlFor="useWallet" className="text-sm cursor-pointer">
                        Use Wallet Balance (₹{walletBalance} available)
                      </label>
                    </div>
                  </div>
                  {useWalletBalance && walletAmountToUse > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Wallet Applied</span>
                      <span>-₹{walletAmountToUse}</span>
                    </div>
                  )}
                </>
              )}
              
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>TO PAY</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>
            
            {/* Pay Button */}
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white mt-4" size="lg" onClick={handlePlaceOrder} disabled={isPlacingOrder || cartItems.length === 0}>
              {isPlacingOrder ? "Processing..." : (totalAmount === 0 ? "Place Order" : `Pay ₹${totalAmount}`)}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Address Selector Modal */}
      <AddressSelector
        open={showAddressSelector}
        onOpenChange={setShowAddressSelector}
        onAddressSelect={(address) => {
          console.log("Address selected:", address);

          const restaurantLatRaw =
            cartRestaurantLatitude ?? cartItems[0]?.seller_latitude ?? null;
          const restaurantLngRaw =
            cartRestaurantLongitude ?? cartItems[0]?.seller_longitude ?? null;

          const restaurantLat =
            typeof restaurantLatRaw === "number" ? restaurantLatRaw : Number(restaurantLatRaw);
          const restaurantLng =
            typeof restaurantLngRaw === "number" ? restaurantLngRaw : Number(restaurantLngRaw);

          const addrLat = address.latitude == null ? NaN : Number(address.latitude);
          const addrLng = address.longitude == null ? NaN : Number(address.longitude);

          console.log("Restaurant location:", {
            lat: restaurantLat,
            lng: restaurantLng,
          });

          // Check if address is within 10km of restaurant
          if (
            Number.isFinite(restaurantLat) &&
            Number.isFinite(restaurantLng) &&
            Number.isFinite(addrLat) &&
            Number.isFinite(addrLng)
          ) {
            const distance = calculateDistance(addrLat, addrLng, restaurantLat, restaurantLng);
            console.log("Calculated distance:", distance, "km");

            if (distance > 10) {
              setAttemptedAddress({
                label: address.label,
                address: address.address,
                latitude: addrLat,
                longitude: addrLng,
              });
              setShowDeliveryNotAvailableModal(true);
              setShowAddressSelector(false);
              return;
            }
          } else {
            console.log("Missing/invalid coordinates - Restaurant:", {
              restaurantLat,
              restaurantLng,
            }, "Address:", {
              addrLat,
              addrLng,
            });
          }

          // Address is valid, update it
          setSelectedAddress({
            ...address,
            latitude: Number.isFinite(addrLat) ? addrLat : address.latitude,
            longitude: Number.isFinite(addrLng) ? addrLng : address.longitude,
          });

          if (Number.isFinite(addrLat) && Number.isFinite(addrLng)) {
            setUserLocation({
              lat: addrLat,
              lng: addrLng,
            });
          }
        }}
        selectedAddress={selectedAddress}
      />

      {/* Login Modal */}
      <LoginForm
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(userData) => {
          login(userData);
          setShowLoginModal(false);
          toast({
            title: "Login Successful",
            description: "You can now place your order",
          });
        }}
        onRegisterRequired={(mobile) => {
          setShowLoginModal(false);
          setRegisterInitialMobile(mobile);
          setShowRegisterModal(true);
        }}
      />

      {/* Register Modal */}
      <RegisterForm
        isOpen={showRegisterModal}
        initialMobile={registerInitialMobile}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={(userData) => {
          login(userData);
          setShowRegisterModal(false);
          toast({
            title: "Registration Successful",
            description: "You can now place your order",
          });
        }}
      />

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
          // Update location to the attempted address before navigating
          if (attemptedAddress) {
            // Update localStorage with new address location
            localStorage.setItem('currentLat', attemptedAddress.latitude.toString());
            localStorage.setItem('currentLng', attemptedAddress.longitude.toString());
            localStorage.setItem('currentLocationName', attemptedAddress.label);
            localStorage.setItem('currentFullLocation', attemptedAddress.address);
            localStorage.setItem('selectedAddress', JSON.stringify({
              label: attemptedAddress.label,
              address: attemptedAddress.address,
              latitude: attemptedAddress.latitude,
              longitude: attemptedAddress.longitude
            }));
            
            // Dispatch addressChanged event so FeaturedRestaurants refetches with new location
            window.dispatchEvent(new CustomEvent('addressChanged', {
              detail: {
                latitude: attemptedAddress.latitude,
                longitude: attemptedAddress.longitude
              }
            }));
          }
          
          setShowDeliveryNotAvailableModal(false);
          // Navigate to restaurants page - FeaturedRestaurants will filter by the new location
          navigate('/restaurants');
        }}
      />
    </div>
  );
};
