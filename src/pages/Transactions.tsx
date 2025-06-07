
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { format, isValid } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Check, X, ArrowLeft } from 'lucide-react';

interface Transaction {
  id: string;
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

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { checkPermission } = useAuth();
  
  const canEdit = checkPermission('transactions', 'edit');

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy HH:mm');
      }
      return 'Invalid Date';
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    const loadTransactions = () => {
      const savedTransactions = localStorage.getItem('transactions');
      if (savedTransactions) {
        try {
          const parsedTransactions = JSON.parse(savedTransactions);
          // Sort by timestamp descending (newest first) and filter out invalid timestamps
          const validTransactions = parsedTransactions.filter((transaction: Transaction) => {
            return transaction.timestamp && transaction.timestamp !== '';
          });
          
          const sortedTransactions = validTransactions.sort(
            (a: Transaction, b: Transaction) => {
              const dateA = new Date(a.timestamp);
              const dateB = new Date(b.timestamp);
              if (isValid(dateA) && isValid(dateB)) {
                return dateB.getTime() - dateA.getTime();
              }
              return 0;
            }
          );
          setTransactions(sortedTransactions);
        } catch (error) {
          console.error('Error loading transactions:', error);
          setTransactions([]);
        }
      }
    };

    loadTransactions();
    
    // Listen for storage changes to update in real-time
    const handleStorageChange = () => {
      loadTransactions();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const handleMarkAsSettled = (id: string) => {
    const updatedTransactions = transactions.map(transaction =>
      transaction.id === id ? { ...transaction, status: 'settled' } : transaction
    );
    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
  };
  
  const handleBack = () => {
    navigate('/');
  };
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="outline" 
              size="icon" 
              className="mr-4" 
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-2xl font-bold">Transactions</h1>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Items</th>
                      <th className="text-center p-2">Type</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-center p-2">Payment Method</th>
                      {canEdit && <th className="text-right p-2">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b">
                        <td className="p-2">{transaction.id}</td>
                        <td className="p-2">{formatTimestamp(transaction.timestamp)}</td>
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{transaction.customerName}</p>
                            <p className="text-xs text-muted-foreground">{transaction.customerMobile}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {transaction.items.slice(0, 2).map(item => (
                              <div key={item.id} className="text-xs">
                                {item.name} x{item.quantity}
                              </div>
                            ))}
                            {transaction.items.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{transaction.items.length - 2} more items
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                            <ArrowDownLeft className="h-3 w-3" />
                            Sale
                          </span>
                        </td>
                        <td className="text-right p-2 font-medium text-green-600">
                          ₹{transaction.total.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            transaction.status === 'settled' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {transaction.status === 'settled' 
                              ? <Check className="h-3 w-3" /> 
                              : <X className="h-3 w-3" />}
                            {transaction.status === 'settled' ? 'Settled' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            (transaction.paymentMethod === 'upi' || transaction.paymentMethod === 'card')
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {transaction.paymentMethod.toUpperCase()}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="p-2 text-right">
                            {transaction.status !== 'settled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleMarkAsSettled(transaction.id)}
                              >
                                Mark as Settled
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={canEdit ? 9 : 8} className="text-center py-8 text-muted-foreground">
                          No transactions found. Complete a sale to see transactions here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Transactions;
