
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Customer } from '@/utils/types';

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  couponUsed: string | null;
  paymentMethod: string;
  timestamp: string;
  status: string;
}

interface CustomerOrdersDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
}

const CustomerOrdersDialog = ({ customer, open, onClose }: CustomerOrdersDialogProps) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (open) {
      // Load orders from transactions (sales) in localStorage
      const savedTransactions = localStorage.getItem('transactions');
      if (savedTransactions) {
        try {
          const allTransactions = JSON.parse(savedTransactions);
          // Filter transactions for this customer
          const customerOrders = allTransactions.filter((transaction: Order) => 
            transaction.customerMobile === customer.mobile || 
            transaction.customerName === customer.name
          );
          setOrders(customerOrders);
        } catch (error) {
          console.error('Error parsing transactions:', error);
          setOrders([]);
        }
      } else {
        setOrders([]);
      }
    }
  }, [customer.mobile, customer.name, open]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTotal = (total: number | undefined | null): string => {
    if (total === undefined || total === null || isNaN(total)) {
      return '0.00';
    }
    return total.toFixed(2);
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Orders for {customer.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p><strong>Customer:</strong> {customer.name}</p>
            <p><strong>Mobile:</strong> {customer.mobile}</p>
            <p><strong>Email:</strong> {customer.email}</p>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found for this customer
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order History ({orders.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id.slice(-8)}</TableCell>
                      <TableCell>{formatDate(order.timestamp)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.items?.map((item, index) => (
                            <div key={index} className="text-sm">
                              {item.name} x{item.quantity}
                            </div>
                          )) || 'No items'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {order.paymentMethod === 'upi' || order.paymentMethod === 'card' ? 'Online' : 'Cash'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">₹{formatTotal(order.total)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status || 'completed')}>
                          {order.status || 'completed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerOrdersDialog;
