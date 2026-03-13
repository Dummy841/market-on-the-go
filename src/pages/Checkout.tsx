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

import { calculateDistance, getExpectedDeliveryTime, getMultiSellerDeliveryFee } from "@/lib/distanceUtils";

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
    clearCart,
    getUniqueSellers,
    getItemsBySeller,
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
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    id: string;
    label: string;
    address: string;
    latitude?: number;
    longitude?: number;
    mobile?: string;
  } | null>(null);
  const [isDeliveryStateValid, setIsDeliveryStateValid] = useState(true);
  const [maxDeliveryDistance, setMaxDeliveryDistance] = useState<number>(0);
  const [deliveryTimeEstimate, setDeliveryTimeEstimate] = useState<string | null>(null);
  const [sellerCoordinatesMap, setSellerCoordinatesMap] = useState<Record<string, { latitude: number; longitude: number }>>({});

  const uniqueSellers = getUniqueSellers();
  const itemsBySeller = getItemsBySeller();
  const sellerCount = uniqueSellers.length;

  // Fetch ALL sellers' coordinates from database
  useEffect(() => {
    const fetchAllSellerCoordinates = async () => {
      if (cartItems.length === 0) return;

      const sellerIds = uniqueSellers.map(s => s.seller_id);
      if (sellerIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('sellers')
          .select('id, seller_latitude, seller_longitude')
          .in('id', sellerIds);

        if (error) {
          console.error('Error fetching seller coordinates:', error);
          return;
        }

        const coordsMap: Record<string, { latitude: number; longitude: number }> = {};
        (data || []).forEach(seller => {
          if (seller.seller_latitude && seller.seller_longitude) {
            coordsMap[seller.id] = {
              latitude: Number(seller.seller_latitude),
              longitude: Number(seller.seller_longitude),
            };
          }
        });
        setSellerCoordinatesMap(coordsMap);
      } catch (error) {
        console.error('Error fetching seller coordinates:', error);
      }
    };

    fetchAllSellerCoordinates();
  }, [cartItems.length, uniqueSellers.length]);

  const ALLOWED_STATES = ['andhra pradesh', 'telangana', 'karnataka', 'tamil nadu'];

  const getIsAfter10PM = () => {
    const now = new Date();
    const istHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
    return istHour >= 22;
  };

  const isAfter10PM = getIsAfter10PM();
  const isDistanceTooFar = maxDeliveryDistance > 10 && selectedAddress != null && selectedAddress.latitude != null;

  // Validate selected address - calculate distance to ALL sellers
  useEffect(() => {
    if (selectedAddress?.latitude && selectedAddress?.longitude && Object.keys(sellerCoordinatesMap).length > 0) {
      let maxDist = 0;
      Object.values(sellerCoordinatesMap).forEach(coords => {
        const distance = calculateDistance(
          selectedAddress.latitude!,
          selectedAddress.longitude!,
          coords.latitude,
          coords.longitude
        );
        if (distance > maxDist) maxDist = distance;
      });
      setMaxDeliveryDistance(maxDist);

      if (getIsAfter10PM()) {
        setDeliveryTimeEstimate('Delivery Tomorrow');
      } else {
        setDeliveryTimeEstimate(getExpectedDeliveryTime(maxDist));
      }
    } else {
      setMaxDeliveryDistance(0);
      setDeliveryTimeEstimate(null);
    }

    if (selectedAddress?.address) {
      const addressLower = selectedAddress.address.toLowerCase();
      const stateValid = ALLOWED_STATES.some(state => addressLower.includes(state));
      setIsDeliveryStateValid(stateValid);
    } else {
      setIsDeliveryStateValid(true);
    }
  }, [selectedAddress, sellerCoordinatesMap]);

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

  // Calculate fees using multi-seller logic
  const deliveryFeeBase = getMultiSellerDeliveryFee(sellerCount, itemTotal, false, maxDeliveryDistance);
  const deliveryFee = hasActivePass && maxDeliveryDistance <= 10 ? 0 : deliveryFeeBase;
  const smallOrderFee = deliveryFeeBase > 0 && itemTotal < 100 && maxDeliveryDistance <= 20 ? Math.round(deliveryFeeBase * 0.5) : 0;
  const platformFee = itemTotal >= 1000 ? 0 : Math.round(itemTotal * 0.05);
  const grossTotal = itemTotal + deliveryFee + platformFee + smallOrderFee;

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

  // Build order data list - one per seller
  const buildOrderDataList = () => {
    if (!user || !selectedAddress) return [];

    const paymentMethod = walletAmountToUse > 0
      ? (totalAmount > 0 ? 'razorpay+wallet' : 'wallet')
      : 'upi';

    const splitDeliveryFee = sellerCount > 0 ? Math.round((deliveryFee / sellerCount) * 100) / 100 : 0;

    return uniqueSellers.map(seller => {
      const sellerItems = itemsBySeller[seller.seller_id] || [];
      const sellerItemTotal = sellerItems.reduce((sum, item) => sum + item.seller_price * item.quantity, 0);
      const sellerPlatformFee = itemTotal > 0 ? Math.round((sellerItemTotal / itemTotal) * platformFee) : 0;
      const sellerTotalAmount = sellerItemTotal + splitDeliveryFee + sellerPlatformFee;

      return {
        user_id: user.id,
        seller_id: seller.seller_id,
        seller_name: seller.seller_name,
        items: sellerItems.map(item => ({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          seller_price: item.seller_price,
          item_photo_url: item.item_photo_url,
        })),
        total_amount: sellerTotalAmount,
        delivery_fee: splitDeliveryFee,
        platform_fee: sellerPlatformFee,
        delivery_address: `${selectedAddress.address}, Location: ${selectedAddress.latitude}, ${selectedAddress.longitude}`,
        delivery_latitude: selectedAddress.latitude ?? userLocation?.lat,
        delivery_longitude: selectedAddress.longitude ?? userLocation?.lng,
        delivery_mobile: selectedAddress.mobile || user?.mobile || '',
        instructions: instructions,
        payment_method: paymentMethod,
      };
    });
  };

  const handlePlaceOrder = async () => {
    if (!user || !isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (cartItems.length === 0) {
      toast({ title: "Empty Cart", description: "Please add items to cart before placing order", variant: "destructive" });
      return;
    }
    if (!selectedAddress) {
      toast({ title: "Add delivery address", description: "Please add a delivery address to place the order.", variant: "destructive" });
      setShowAddressSelector(true);
      return;
    }
    if (totalAmount > 0 && !razorpayLoaded) {
      toast({ title: "Loading...", description: "Payment gateway is loading. Please try again.", variant: "destructive" });
      return;
    }

    try {
      setIsPlacingOrder(true);
      if (!userLocation) getUserLocation();

      const orderDataList = buildOrderDataList();
      if (orderDataList.length === 0) {
        throw new Error('No orders to create');
      }

      const processWalletDebit = async (): Promise<string | null> => {
        if (walletAmountToUse <= 0) return null;
        const { error: walletUpdateError } = await supabase
          .from('user_wallets')
          .update({ balance: walletBalance - walletAmountToUse, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (walletUpdateError) throw new Error('Failed to debit wallet');

        const sellerNames = uniqueSellers.map(s => s.seller_name).join(', ');
        const { data: txnRow, error: txnError } = await supabase
          .from('user_wallet_transactions')
          .insert({ user_id: user.id, type: 'debit', amount: walletAmountToUse, description: `Used for order at ${sellerNames}` })
          .select('id')
          .single();
        if (txnError) { console.error('Error creating transaction:', txnError); return null; }
        refreshBalance();
        return (txnRow as any)?.id ?? null;
      };

      // If wallet covers full amount
      if (totalAmount === 0 && walletAmountToUse > 0) {
        const walletTxnId = await processWalletDebit();

        const createdOrders = [];
        for (const od of orderDataList) {
          const { data: orderResult, error: orderError } = await supabase
            .from('orders')
            .insert(od)
            .select()
            .single();
          if (orderError) throw new Error(orderError.message || 'Failed to create order');
          createdOrders.push(orderResult);
        }

        // Attach order IDs to wallet debit transaction
        if (walletTxnId && createdOrders.length > 0) {
          await supabase
            .from('user_wallet_transactions')
            .update({ order_id: createdOrders[0].id })
            .eq('id', walletTxnId);
        }

        if (createdOrders[0]) setActiveOrder(createdOrders[0]);

        clearCart();
        toast({ title: "Order Placed Successfully!", description: `${createdOrders.length} order${createdOrders.length > 1 ? 's' : ''} created. Paid using wallet balance.` });
        navigate('/');
        setIsPlacingOrder(false);
        return;
      }

      // Create Razorpay order for remaining amount
      const { data: razorpayOrder, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: totalAmount, currency: 'INR', receipt: `order_${Date.now()}` }
      });
      if (orderError || !razorpayOrder) throw new Error(orderError?.message || 'Failed to create payment order');

      const sellerNames = uniqueSellers.map(s => s.seller_name).join(', ');

      const options = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Zippy Delivery',
        description: `Order from ${sellerNames}`,
        order_id: razorpayOrder.order_id,
        handler: async function (response: any) {
          try {
            const walletTxnId = await processWalletDebit();

            const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_data_list: orderDataList,
              }
            });

            if (verifyError || !verifyResult?.success) {
              throw new Error(verifyError?.message || verifyResult?.error || 'Payment verification failed');
            }

            const createdOrderId = verifyResult?.order?.id;
            if (walletTxnId && createdOrderId) {
              await supabase
                .from('user_wallet_transactions')
                .update({ order_id: createdOrderId })
                .eq('id', walletTxnId);
            }

            if (verifyResult.order) setActiveOrder(verifyResult.order);

            clearCart();
            const orderCount = verifyResult.orders?.length || 1;
            toast({ title: "Order Placed Successfully!", description: `${orderCount} order${orderCount > 1 ? 's' : ''} placed successfully.` });
            navigate('/');
          } catch (error: any) {
            console.error('Error verifying payment:', error);
            toast({ title: "Payment Verification Failed", description: error.message || "Please contact support if amount was deducted.", variant: "destructive" });
          } finally {
            setIsPlacingOrder(false);
          }
        },
        prefill: { name: user.name, contact: user.mobile },
        theme: { color: '#16a34a' },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI Apps",
                instruments: [{ method: "upi", flows: ["intent", "collect", "qr"], apps: ["phonepe", "google_pay", "paytm", "cred", "bhim", "amazon_pay", "whatsapp", "freecharge", "mobikwik"] }]
              },
              other: {
                name: "Other Payment Methods",
                instruments: [{ method: "card" }, { method: "netbanking" }, { method: "wallet" }]
              }
            },
            sequence: ["block.upi", "block.other"],
            preferences: { show_default_blocks: false }
          }
        },
        modal: {
          ondismiss: function() {
            setIsPlacingOrder(false);
            toast({ title: "Payment Cancelled", description: "You cancelled the payment. Please try again.", variant: "destructive" });
          },
          confirm_close: true,
          escape: false,
          backdropclose: false
        },
        redirect: false
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast({ title: "Payment Failed", description: error.message || "Failed to initiate payment. Please try again.", variant: "destructive" });
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
              <h1 className="text-lg font-semibold">
                {sellerCount > 1 ? `${sellerCount} Sellers` : uniqueSellers[0]?.seller_name || 'Checkout'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedAddress?.address || "Add delivery address"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Cart Items grouped by seller */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-6">
              {uniqueSellers.map(seller => (
                <div key={seller.seller_id}>
                  {sellerCount > 1 && (
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{seller.seller_name}</p>
                  )}
                  <div className="space-y-4">
                    {(itemsBySeller[seller.seller_id] || []).map(item => (
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
              if (!isAuthenticated) { setShowLoginModal(true); return; }
              setShowAddressSelector(true);
            }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">{selectedAddress ? selectedAddress.label : "Add Address"}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{selectedAddress ? selectedAddress.address : "Tap to add a delivery address"}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <Textarea placeholder="Any instructions for the restaurant or delivery partner?" value={instructions} onChange={e => setInstructions(e.target.value)} className="mt-3" />

            {deliveryTimeEstimate && isDeliveryStateValid && !isDistanceTooFar && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700">Expected Delivery:</span>
                <span className="text-sm text-blue-600">{deliveryTimeEstimate}</span>
              </div>
            )}

            {!isDeliveryStateValid && selectedAddress && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700">We can't deliver to your location</p>
                <p className="text-xs text-red-500 mt-1">Delivery is available only in Andhra Pradesh, Telangana, Karnataka, and Tamil Nadu.</p>
              </div>
            )}

            {isDistanceTooFar && isDeliveryStateValid && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700">Seller too far from your location</p>
                <p className="text-xs text-red-500 mt-1">All sellers must be within 10km. Farthest seller is {maxDeliveryDistance.toFixed(1)}km away.</p>
              </div>
            )}
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
                    <button onClick={() => setShowAddMoreItemsModal(true)} className="text-xs text-orange-500 font-medium hover:underline">Remove</button>
                  </div>
                  <span>₹{smallOrderFee}</span>
                </div>
              )}
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-2">
                  <span>Delivery Fee</span>
                  {!hasActivePass && deliveryFee > 0 && (
                    <button onClick={() => setShowZippyPassModal(true)} className="text-xs text-orange-500 font-medium hover:underline">Remove</button>
                  )}
                </div>
                <span className={hasActivePass ? 'text-green-600' : ''}>
                  {deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}
                </span>
              </div>
              {hasActivePass && (
                <p className="text-xs text-muted-foreground ml-1">Free delivery up to 10km only</p>
              )}
              {!hasActivePass && deliveryFee > 0 && (
                <p className="text-xs text-green-600 ml-1">💡 Buy Zippy Pass or shop above ₹299 for free delivery</p>
              )}
              <div className="flex justify-between text-sm">
                <span>Platform Fee</span>
                <span>₹{platformFee}</span>
              </div>

              {walletBalance > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="useWallet" checked={useWalletBalance} onCheckedChange={(checked) => setUseWalletBalance(checked === true)} />
                      <label htmlFor="useWallet" className="text-sm cursor-pointer">Use Wallet Balance (₹{walletBalance} available)</label>
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

            <Button className="w-full bg-green-600 hover:bg-green-700 text-white mt-4" size="lg" onClick={handlePlaceOrder} disabled={isPlacingOrder || cartItems.length === 0 || !isDeliveryStateValid || isDistanceTooFar}>
              {isPlacingOrder ? "Processing..." : (totalAmount === 0 ? "Place Order" : `Pay ₹${totalAmount}`)}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AddressSelector
        open={showAddressSelector}
        onOpenChange={setShowAddressSelector}
        onAddressSelect={(address) => {
          const addrLat = address.latitude == null ? NaN : Number(address.latitude);
          const addrLng = address.longitude == null ? NaN : Number(address.longitude);
          setSelectedAddress({
            ...address,
            latitude: Number.isFinite(addrLat) ? addrLat : address.latitude,
            longitude: Number.isFinite(addrLng) ? addrLng : address.longitude,
          });
          if (Number.isFinite(addrLat) && Number.isFinite(addrLng)) {
            setUserLocation({ lat: addrLat, lng: addrLng });
          }
        }}
        selectedAddress={selectedAddress}
      />

      <LoginForm
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(userData) => {
          login(userData);
          setShowLoginModal(false);
          toast({ title: "Login Successful", description: "You can now place your order" });
        }}
        onRegisterRequired={(mobile) => {
          setShowLoginModal(false);
          setRegisterInitialMobile(mobile);
          setShowRegisterModal(true);
        }}
      />

      <RegisterForm
        isOpen={showRegisterModal}
        initialMobile={registerInitialMobile}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={(userData) => {
          login(userData);
          setShowRegisterModal(false);
          toast({ title: "Registration Successful", description: "You can now place your order" });
        }}
      />

      <ZippyPassModal
        isOpen={showZippyPassModal}
        onClose={() => setShowZippyPassModal(false)}
        onSuccess={() => {
          checkSubscription();
          setShowZippyPassModal(false);
        }}
      />

      <AddMoreItemsModal
        isOpen={showAddMoreItemsModal}
        onClose={() => setShowAddMoreItemsModal(false)}
        sellerId={cartItems[0]?.seller_id || ''}
        sellerName={uniqueSellers[0]?.seller_name || ''}
        targetAmount={100}
        currentTotal={itemTotal}
      />
    </div>
  );
};
