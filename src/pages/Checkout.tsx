import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Minus, Tag, CreditCard, Wallet, Building2, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useOrderTracking } from "@/contexts/OrderTrackingContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AddressSelector from "@/components/AddressSelector";
export const Checkout = () => {
  const {
    cartItems,
    updateQuantity,
    getTotalPrice,
    cartRestaurantName,
    clearCart
  } = useCart();
  const {
    user,
    isAuthenticated
  } = useUserAuth();
  const { setActiveOrder } = useOrderTracking();
  const navigate = useNavigate();
  const [selectedPayment, setSelectedPayment] = useState("upi");
  const [instructions, setInstructions] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
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

  // Load user's default address
  const loadDefaultAddress = async () => {
    if (!user) return;
    
    // First check localStorage for selected address
    const storedAddress = localStorage.getItem('selectedAddress');
    if (storedAddress) {
      try {
        const parsed = JSON.parse(storedAddress);
        // Need to get full details from DB for this address
        const { data } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('label', parsed.label)
          .eq('full_address', parsed.address)
          .single();
        
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
    
    // Fallback to loading most recent address from database
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
          mobile: data.mobile
        });
      }
    } catch (error) {
      console.error('No saved addresses found, using default');
    }
  };

  // Load default address on component mount
  useEffect(() => {
    if (user) {
      loadDefaultAddress();
    }
  }, [user]);
  const itemTotal = getTotalPrice();
  const deliveryFee = itemTotal >= 499 ? 0 : 19;
  const platformFee = Math.round(itemTotal * 0.05);
  const totalAmount = itemTotal + deliveryFee + platformFee;
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, error => {
        console.error('Error getting location:', error);
        toast({
          title: "Location Access",
          description: "Could not get your location. Using default address.",
          variant: "destructive"
        });
      });
    }
  };
  const handlePlaceOrder = async () => {
    if (!user || !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to place an order",
        variant: "destructive"
      });
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
    try {
      setIsPlacingOrder(true);

      // Get user location if not already obtained
      if (!userLocation) {
        getUserLocation();
      }

      // Get seller info from first item (all items are from same restaurant)
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
        delivery_address: selectedAddress.address,
        delivery_latitude: selectedAddress.latitude || userLocation?.lat,
        delivery_longitude: selectedAddress.longitude || userLocation?.lng,
        delivery_mobile: selectedAddress.mobile || user?.mobile || '',
        instructions: instructions,
        payment_method: selectedPayment,
        status: 'pending'
      };
      const {
        data,
        error
      } = await supabase.from('orders').insert([orderData]).select().single();
      if (error) throw error;

      // Set active order for tracking
      if (data) {
        // Fetch full order details with related data
        const { data: orderData } = await supabase
          .from('orders')
          .select('*, delivery_partners(id, name, mobile, profile_photo_url), sellers(seller_latitude, seller_longitude, seller_name)')
          .eq('id', data.id)
          .single();
        
        if (orderData) {
          setActiveOrder(orderData);
        }
      }

      // Clear cart after successful order
      clearCart();
      toast({
        title: "Order Placed Successfully!",
        description: "Your order has been placed and will be processed soon."
      });

      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Mock recommended items
  const recommendedItems = [{
    id: "1",
    name: "Chicken Fried Rice",
    price: 240,
    image: "/lovable-uploads/8c4cd337-1c49-4c15-8d93-a34406a5b9bb.png"
  }, {
    id: "2",
    name: "Chilli Chicken",
    price: 260,
    image: "/lovable-uploads/8c4cd337-1c49-4c15-8d93-a34406a5b9bb.png"
  }, {
    id: "3",
    name: "Veg Fried Rice",
    price: 200,
    image: "/lovable-uploads/8c4cd337-1c49-4c15-8d93-a34406a5b9bb.png"
  }, {
    id: "4",
    name: "Special Biryani",
    price: 264,
    image: "/lovable-uploads/8c4cd337-1c49-4c15-8d93-a34406a5b9bb.png"
  }];
  return <div className="min-h-screen bg-gray-50">
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
        {/* Savings Banner */}
        

        {/* Membership Offer */}
        

        {/* Cart Items */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              {cartItems.map(item => <div key={item.id} className="flex items-center justify-between">
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
                </div>)}
            </div>

            <div className="flex gap-2 mt-4">
              
              
              
            </div>
          </CardContent>
        </Card>

        {/* Complete Your Meal */}
        

        {/* Savings Corner */}
        

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

        {/* Payment Methods */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Payment Method</h3>
            <div className="space-y-2">
              <div className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${selectedPayment === 'upi' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`} onClick={() => setSelectedPayment('upi')}>
                <Wallet className="h-5 w-5" />
                <span className="font-medium">UPI</span>
              </div>
              <div className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${selectedPayment === 'card' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`} onClick={() => setSelectedPayment('card')}>
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Credit/Debit Card</span>
              </div>
              <div className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${selectedPayment === 'netbanking' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`} onClick={() => setSelectedPayment('netbanking')}>
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Net Banking</span>
              </div>
            </div>
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
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</span>
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
              {isPlacingOrder ? "Placing Order..." : `Pay ₹${totalAmount}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Address Selector Modal */}
      <AddressSelector open={showAddressSelector} onOpenChange={setShowAddressSelector} onAddressSelect={address => {
      setSelectedAddress(address);
      if (address.latitude && address.longitude) {
        setUserLocation({
          lat: address.latitude,
          lng: address.longitude
        });
      }
    }} selectedAddress={selectedAddress} />
    </div>;
};