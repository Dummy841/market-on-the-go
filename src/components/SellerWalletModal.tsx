import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

interface SellerWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  walletBalance: number;
}

const SellerWalletModal = ({ open, onOpenChange, sellerId, walletBalance }: SellerWalletModalProps) => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && sellerId) {
      fetchTransactions();
    }
  }, [open, sellerId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seller_wallet_transactions')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.log('Wallet transactions table may not exist yet:', error);
        setTransactions([]);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            My Wallet
          </DialogTitle>
        </DialogHeader>

        {/* Wallet Balance Card */}
        <Card className="bg-gradient-to-r from-primary to-orange-500 text-white">
          <CardContent className="p-6">
            <p className="text-sm opacity-90">Available Balance</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(walletBalance)}</p>
            <p className="text-xs mt-2 opacity-75 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Daily earnings added by 9 PM
            </p>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">Transaction History</h3>
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-xs mt-1">Your daily earnings will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn) => (
                <Card key={txn.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellerWalletModal;
