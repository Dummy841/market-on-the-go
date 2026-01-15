import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, ArrowLeft, Filter, FileText, ImageIcon, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
  receipt_url?: string | null;
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
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

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

      // Fetch transactions with optional date filter
      let query = supabase
        .from('seller_wallet_transactions')
        .select('*')
        .eq('seller_id', seller.id)
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
      // Create withdrawal transaction with "Pending" status in description
      const { error: txnError } = await supabase
        .from('seller_wallet_transactions')
        .insert({
          seller_id: seller.id,
          type: 'debit',
          amount: walletBalance,
          description: `Pending - Withdrawal to bank - ${seller.bank_name} (${seller.account_number.slice(-4)})`
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
        {/* Balance Card with Bank Details and Withdraw - Sticky */}
        <div className="sticky top-0 z-10 bg-background pb-2">
          <Card className="bg-gradient-to-r from-primary to-orange-500 text-white">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left: Balance */}
                <div>
                  <p className="text-sm opacity-90">Available Balance</p>
                  <p className="text-3xl font-bold">{formatCurrency(walletBalance)}</p>
                  <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Daily earnings added by 11:59 PM
                  </p>
                </div>

                {/* Right: Bank Details and Withdraw Button */}
                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="text-xs opacity-90 text-left md:text-right">
                    <p>Bank: {seller.bank_name}</p>
                    <p>A/C: ****{seller.account_number.slice(-4)} | IFSC: {seller.ifsc_code}</p>
                  </div>
                  <Button
                    onClick={handleWithdraw}
                    disabled={!canWithdraw || walletBalance <= 0 || withdrawing}
                    variant="secondary"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {withdrawing ? 'Processing...' : `Withdraw ${formatCurrency(walletBalance)}`}
                  </Button>
                  {withdrawDisabledReason && (
                    <p className="text-[10px] opacity-75">{withdrawDisabledReason}</p>
                  )}
                </div>
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
                <p>No transactions found</p>
                <p className="text-xs mt-1">Your daily earnings will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => {
                  const isPending = txn.type === 'debit' && txn.description.includes('Pending');
                  const isSettled = txn.type === 'debit' && !txn.description.includes('Pending');
                  
                  return (
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
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {txn.description.replace('Pending - ', '').replace('Settled - ', '')}
                            </p>
                            {txn.type === 'debit' && (
                              <Badge 
                                variant="secondary" 
                                className={isPending ? 'bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0' : 'bg-green-100 text-green-700 text-[10px] px-1.5 py-0'}
                              >
                                {isPending ? 'Pending' : 'Settled'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(txn.created_at), 'dd MMM yyyy, hh:mm a')}
                          </p>
                          {txn.type === 'debit' && isSettled && txn.receipt_url && (
                            <a 
                              href={txn.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                            >
                              {txn.receipt_url.includes('.pdf') ? (
                                <FileText className="h-3 w-3" />
                              ) : (
                                <ImageIcon className="h-3 w-3" />
                              )}
                              View Receipt
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <Badge variant={txn.type === 'credit' ? 'default' : 'secondary'} className={txn.type === 'credit' ? 'bg-green-500' : 'bg-red-500'}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SellerWallet;
