
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Printer, Plus, ArrowLeft } from 'lucide-react';

const OrderReceiptPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { transaction } = location.state || {};

  if (!transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No transaction data found</p>
            <Button onClick={() => navigate('/sales-dashboard')}>
              Back to Sales Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleNewSale = () => {
    navigate('/sales-dashboard');
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6 print:hidden">
          <Button variant="outline" size="icon" onClick={() => navigate('/sales-dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Order Receipt</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Payment Successful!</CardTitle>
            <p className="text-muted-foreground">Transaction ID: {transaction.id}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Store Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">Dostan Farms</h2>
              <p className="text-sm text-muted-foreground">Fresh Farm Products</p>
              <p className="text-sm text-muted-foreground">Phone: +91 12345 67890</p>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="font-semibold mb-2">Customer Details</h3>
              <div className="bg-muted p-3 rounded-md">
                <p><strong>Name:</strong> {transaction.customerName}</p>
                <p><strong>Mobile:</strong> {transaction.customerMobile}</p>
                <p><strong>Payment Method:</strong> {transaction.paymentMethod.toUpperCase()}</p>
                <p><strong>Date:</strong> {new Date(transaction.timestamp).toLocaleString()}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-semibold mb-2">Items Purchased</h3>
              <div className="space-y-2">
                {transaction.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <h3 className="font-semibold mb-2">Payment Summary</h3>
              <div className="bg-muted p-3 rounded-md space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{transaction.subtotal.toFixed(2)}</span>
                </div>
                {transaction.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount {transaction.couponUsed ? `(${transaction.couponUsed})` : ''}:</span>
                    <span>-₹{transaction.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-1">
                  <span>Total Paid:</span>
                  <span>₹{transaction.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Thank you for shopping with us!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Visit again for fresh farm products
              </p>
            </div>

            {/* Actions - Print and New Sale */}
            <div className="flex gap-4 print:hidden">
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={handleNewSale} className="flex-1 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderReceiptPage;
