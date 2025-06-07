
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, ShoppingCart, Tag, Smartphone } from 'lucide-react';
import QRCode from 'react-qr-code';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Coupon {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscountLimit?: number;
  expiryDate: string;
  targetType?: 'all' | 'customer' | 'employee';
  targetUserId?: string;
}

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showUPIScanner, setShowUPIScanner] = useState(false);

  // Get cart data from navigation state
  const cartItems: CartItem[] = location.state?.cartItems || [];
  const originalTotal: number = location.state?.total || 0;

  useEffect(() => {
    // Load active coupons from localStorage (from coupons management page)
    const savedCoupons = localStorage.getItem('coupons');
    if (savedCoupons) {
      try {
        const parsedCoupons = JSON.parse(savedCoupons);
        // Filter only active coupons (not expired)
        const activeCoupons = parsedCoupons.filter((coupon: Coupon) => {
          const expiryDate = new Date(coupon.expiryDate);
          return expiryDate > new Date();
        });
        setCoupons(activeCoupons);
      } catch (error) {
        console.error('Error loading coupons:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Show UPI scanner when UPI is selected
    setShowUPIScanner(paymentMethod === 'upi');
  }, [paymentMethod]);

  const applyCoupon = () => {
    if (!selectedCoupon) {
      toast({
        title: "No coupon selected",
        description: "Please select a coupon to apply",
        variant: "destructive"
      });
      return;
    }

    const coupon = coupons.find(c => c.code === selectedCoupon);
    if (coupon) {
      setAppliedCoupon(coupon);
      toast({
        title: "Coupon applied",
        description: `${coupon.code} has been applied successfully`,
      });
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setSelectedCoupon('');
    toast({
      title: "Coupon removed",
      description: "Coupon has been removed from your order",
    });
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    if (appliedCoupon.discountType === 'percentage') {
      const discountAmount = (originalTotal * appliedCoupon.discountValue) / 100;
      return appliedCoupon.maxDiscountLimit 
        ? Math.min(discountAmount, appliedCoupon.maxDiscountLimit)
        : discountAmount;
    } else {
      return Math.min(appliedCoupon.discountValue, originalTotal);
    }
  };

  const finalTotal = originalTotal - calculateDiscount();

  const handlePayment = () => {
    if (!customerName.trim()) {
      toast({
        title: "Customer name required",
        description: "Please enter customer name",
        variant: "destructive"
      });
      return;
    }

    if (!customerMobile.trim()) {
      toast({
        title: "Mobile number required",
        description: "Please enter customer mobile number",
        variant: "destructive"
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    // Create transaction data
    const transaction = {
      id: Date.now().toString(),
      customerName,
      customerMobile,
      items: cartItems,
      subtotal: originalTotal,
      discount: calculateDiscount(),
      total: finalTotal,
      couponUsed: appliedCoupon?.code || null,
      paymentMethod,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    // Save transaction to localStorage
    const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    existingTransactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(existingTransactions));

    // Navigate to receipt page
    navigate('/order-receipt', {
      state: { transaction }
    });
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Items Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">No items were found for checkout.</p>
            <Button onClick={() => navigate('/sales-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sales
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/sales-dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Payment</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Details & Payment */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customerMobile">Mobile Number</Label>
                  <Input
                    id="customerMobile"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="Enter mobile number"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>

                {/* UPI Scanner */}
                {showUPIScanner && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Smartphone className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-600">Scan QR Code to Pay</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <QRCode
                        value={`upi://pay?pa=merchant@upi&pn=${customerName}&am=${finalTotal}&cu=INR&tn=Payment for Order ${Date.now()}`}
                        size={200}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Amount: ₹{finalTotal.toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Apply Coupon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{appliedCoupon.code}</span>
                      <Badge variant="secondary">
                        {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : `₹${appliedCoupon.discountValue}`}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeCoupon}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {coupons.length > 0 ? (
                      <>
                        <Select value={selectedCoupon} onValueChange={setSelectedCoupon}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a coupon" />
                          </SelectTrigger>
                          <SelectContent>
                            {coupons.map((coupon) => (
                              <SelectItem key={coupon.code} value={coupon.code}>
                                {coupon.code} - {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} off
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={applyCoupon} variant="outline" className="w-full">
                          Apply Coupon
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No active coupons available
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {cartItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">₹{item.price} × {item.quantity}</p>
                      </div>
                      <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{originalTotal.toFixed(2)}</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedCoupon.code}):</span>
                      <span>-₹{calculateDiscount().toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handlePayment}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Complete Payment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
