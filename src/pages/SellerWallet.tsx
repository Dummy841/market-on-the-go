import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, ArrowLeft, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

interface SellerWithdrawal {
  id: string;
  seller_id: string;
  last_withdrawal_date: string;
}

const SellerWallet = () => {
  const { seller, loading } = useSellerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [withdrawDisabledReason, setWithdrawDisabledReason] = useState('');

  useEffect(() => {
    if (!loading && !seller) {
      navigate('/seller-login');
    }
  }, [seller, loading, navigate]);

  useEffect(() => {
    if (seller) {
      fetchWalletData();
      checkWithdrawEligibility();
    }
  }, [seller]);

  const fetchWalletData = async () => {
    if (!seller) return;
    setLoadingTxns(true);

    try {
      // Fetch wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('seller_wallets')
        .select('balance')
        .eq('seller_id', seller.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error fetching wallet:', walletError);
      }
      setWalletBalance((walletData as any)?.balance || 0);

      // Fetch transactions
      const { data: txnData, error: txnError } = await supabase
        .from('seller_wallet_transactions')
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false })
        .limit(100);

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

  const checkWithdrawEligibility = async () => {
    if (!seller) return;

    const now = new Date();
    const hours = now.getHours();

    // Disable between 9 PM (21) and 6 AM (6)
    if (hours >= 21 || hours < 6) {
      setCanWithdraw(false);
      setWithdrawDisabledReason('Withdrawals are disabled between 9 PM and 6 AM');
      return;
    }

    // Check if already withdrawn today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const { data, error } = await supabase
        .from('seller_wallet_transactions')
        .select('*')
        .eq('seller_id', seller.id)
        .eq('type', 'debit')
        .gte('created_at', todayStart.toISOString())
        .limit(1);

      if (error) {
        console.error('Error checking withdrawal eligibility:', error);
        setCanWithdraw(true);
        setWithdrawDisabledReason('');
        return;
      }

      if (data && data.length > 0) {
        setCanWithdraw(false);
        setWithdrawDisabledReason('You can only withdraw once per day');
      } else {
        setCanWithdraw(true);
        setWithdrawDisabledReason('');
      }
    } catch (error) {
      console.error('Error checking withdrawal eligibility:', error);
      setCanWithdraw(true);
    }
  };

  const handleWithdraw = async () => {
    if (!seller || !canWithdraw || walletBalance <= 0) return;

    setWithdrawing(true);

    try {
      // Create withdrawal transaction
      const { error: txnError } = await supabase
        .from('seller_wallet_transactions')
        .insert({
          seller_id: seller.id,
          type: 'debit',
          amount: walletBalance,
          description: `Withdrawal to bank - ${seller.bank_name} (${seller.account_number.slice(-4)})`
        });

      if (txnError) throw txnError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('seller_wallets')
        .update({ balance: 0 })
        .eq('seller_id', seller.id);

      if (walletError) throw walletError;

      toast({
        title: "Withdrawal Initiated",
        description: `₹${walletBalance} will be transferred to your bank account within 24-48 hours`,
      });

      setWalletBalance(0);
      setCanWithdraw(false);
      setWithdrawDisabledReason('You can only withdraw once per day');
      fetchWalletData();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process withdrawal",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/seller-dashboard')}>
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
        <Card className="bg-gradient-to-r from-primary to-orange-500 text-white">
          <CardContent className="p-6">
            <p className="text-sm opacity-90">Available Balance</p>
            <p className="text-4xl font-bold mt-1">{formatCurrency(walletBalance)}</p>
            <p className="text-xs mt-3 opacity-75 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Daily earnings added by 11:59 PM
            </p>
          </CardContent>
        </Card>

        {/* Withdraw Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5" />
              Withdraw to Bank
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Bank: {seller.bank_name}</p>
              <p>Account: ****{seller.account_number.slice(-4)}</p>
              <p>IFSC: {seller.ifsc_code}</p>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={!canWithdraw || walletBalance <= 0 || withdrawing}
              className="w-full"
              size="lg"
            >
              {withdrawing ? 'Processing...' : `Withdraw ${formatCurrency(walletBalance)}`}
            </Button>

            {withdrawDisabledReason && (
              <p className="text-sm text-muted-foreground text-center">{withdrawDisabledReason}</p>
            )}
            {walletBalance <= 0 && !withdrawDisabledReason && (
              <p className="text-sm text-muted-foreground text-center">No balance to withdraw</p>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTxns ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-xs mt-1">Your daily earnings will appear here</p>
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
                      </div>
                    </div>
                    <Badge variant={txn.type === 'credit' ? 'default' : 'secondary'} className={txn.type === 'credit' ? 'bg-green-500' : 'bg-red-500'}>
                      {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SellerWallet;
