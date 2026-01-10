import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, ArrowLeft, Filter, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  order_id?: string | null;
  created_at: string;
}

const UserWallet = () => {
  const { user, isAuthenticated, isLoading } = useUserAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isAddingMoney, setIsAddingMoney] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;
    setLoadingTxns(true);

    try {
      // Fetch wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        console.error('Error fetching wallet:', walletError);
      }
      setWalletBalance(walletData?.balance || 0);

      // Fetch transactions with optional date filter
      let query = supabase
        .from('user_wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterFrom) {
        query = query.gte('created_at', startOfDay(parseISO(filterFrom)).toISOString());
      }
      if (filterTo) {
        query = query.lte('created_at', endOfDay(parseISO(filterTo)).toISOString());
      }

      const { data: txnData, error: txnError } = await query;

      if (txnError) {
        console.error('Error fetching transactions:', txnError);
      }
      setTransactions((txnData as unknown as WalletTransaction[]) || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoadingTxns(false);
    }
  };

  const handleAddMoney = async () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount (minimum ₹1)",
        variant: "destructive"
      });
      return;
    }

    if (amount > 5000) {
      toast({
        title: "Amount Too High",
        description: "Maximum amount you can add is ₹5000",
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
      setIsAddingMoney(true);

      // Create Razorpay order
      const { data: razorpayOrder, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: amount,
          currency: 'INR',
          receipt: `wallet_${user?.id}_${Date.now()}`
        }
      });

      if (orderError || !razorpayOrder) {
        throw new Error(orderError?.message || 'Failed to create payment order');
      }

      console.log('Razorpay order created:', razorpayOrder);
      setShowAddMoneyModal(false);

      // Open Razorpay checkout
      const options = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Add Money to Wallet',
        description: `Add ₹${amount} to wallet`,
        order_id: razorpayOrder.order_id,
        handler: async function (response: any) {
          console.log('Payment successful:', response);
          
          try {
            // Verify payment and add to wallet
            const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-wallet-topup', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                user_id: user?.id,
                amount: amount
              }
            });

            if (verifyError || !verifyResult?.success) {
              throw new Error(verifyError?.message || verifyResult?.error || 'Payment verification failed');
            }

            toast({
              title: "Money Added!",
              description: `₹${amount} added to your wallet successfully.`
            });

            // Refresh wallet data
            fetchWalletData();
            setAddAmount('');
          } catch (error: any) {
            console.error('Error verifying payment:', error);
            toast({
              title: "Payment Verification Failed",
              description: error.message || "Please contact support if amount was deducted.",
              variant: "destructive"
            });
          } finally {
            setIsAddingMoney(false);
          }
        },
        prefill: {
          name: user?.name,
          contact: user?.mobile
        },
        theme: {
          color: '#f97316'
        },
        modal: {
          ondismiss: function() {
            setIsAddingMoney(false);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment.",
              variant: "destructive"
            });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Error adding money:', error);
      toast({
        title: "Failed to Add Money",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
      setIsAddingMoney(false);
    }
  };

  const handleApplyFilter = () => {
    fetchWalletData();
  };

  const handleClearFilter = () => {
    setFilterFrom('');
    setFilterTo('');
    fetchWalletData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const quickAmounts = [100, 200, 500, 1000];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">My Wallet</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Balance Card */}
        <div className="sticky top-0 z-10 bg-background pb-2">
          <Card className="bg-gradient-to-r from-primary to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm opacity-90">Wallet Balance</p>
                <p className="text-4xl font-bold mt-1">{formatCurrency(walletBalance)}</p>
                <p className="text-xs mt-2 opacity-75 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Use this balance at checkout
                </p>
                <Button 
                  onClick={() => setShowAddMoneyModal(true)}
                  className="mt-4 bg-white text-primary hover:bg-white/90"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Money
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Filter */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Label htmlFor="filterFrom" className="text-xs">From</Label>
                <Input 
                  id="filterFrom" 
                  type="date" 
                  value={filterFrom} 
                  onChange={e => setFilterFrom(e.target.value)} 
                  className="h-8 w-32 text-xs" 
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filterTo" className="text-xs">To</Label>
                <Input 
                  id="filterTo" 
                  type="date" 
                  value={filterTo} 
                  onChange={e => setFilterTo(e.target.value)} 
                  className="h-8 w-32 text-xs" 
                />
              </div>
              <Button onClick={handleApplyFilter} size="sm" className="h-8">
                Apply
              </Button>
              {(filterFrom || filterTo) && (
                <Button onClick={handleClearFilter} variant="outline" size="sm" className="h-8">
                  Clear
                </Button>
              )}
            </div>

            {loadingTxns ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-xs mt-1">Add money or get refunds from rejected orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${txn.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {txn.type === 'credit' ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.created_at), 'dd MMM yyyy, hh:mm a')}
                        </p>
                        {txn.order_id && (
                          <p className="text-xs text-muted-foreground">
                            Order: #{txn.order_id.slice(0, -4)}
                            <span className="font-semibold">{txn.order_id.slice(-4)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={txn.type === 'credit' ? 'default' : 'secondary'} 
                      className={txn.type === 'credit' ? 'bg-green-500' : 'bg-red-500'}
                    >
                      {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Money Modal */}
      <Dialog open={showAddMoneyModal} onOpenChange={setShowAddMoneyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Money to Wallet</DialogTitle>
            <DialogDescription>
              Enter the amount you want to add to your wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                min="1"
                className="text-lg"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  onClick={() => setAddAmount(amt.toString())}
                  className={addAmount === amt.toString() ? 'border-primary bg-primary/10' : ''}
                >
                  ₹{amt}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMoneyModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddMoney} 
              disabled={isAddingMoney || !addAmount}
              className="bg-primary hover:bg-primary/90"
            >
              {isAddingMoney ? 'Processing...' : `Add ₹${addAmount || '0'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserWallet;
