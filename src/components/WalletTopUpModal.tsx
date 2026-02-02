import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Wallet, IndianRupee } from "lucide-react";

interface WalletTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentBalance: number;
  onSuccess: () => void;
}

export const WalletTopUpModal = ({
  isOpen,
  onClose,
  userId,
  userName,
  currentBalance,
  onSuccess,
}: WalletTopUpModalProps) => {
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTopUp = async () => {
    const topUpAmount = parseFloat(amount);
    
    if (!topUpAmount || topUpAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!remarks.trim()) {
      toast({
        title: "Remarks Required",
        description: "Please enter remarks for this transaction",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if wallet exists
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      const newBalance = (walletData?.balance || 0) + topUpAmount;

      if (!walletData) {
        // Create wallet
        const { error: createError } = await supabase
          .from('user_wallets')
          .insert({
            user_id: userId,
            balance: topUpAmount,
          });
        if (createError) throw createError;
      } else {
        // Update wallet balance
        const { error: updateError } = await supabase
          .from('user_wallets')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        if (updateError) throw updateError;
      }

      // Create transaction record as cashback
      const { error: txnError } = await supabase
        .from('user_wallet_transactions')
        .insert({
          user_id: userId,
          type: 'cashback',
          amount: topUpAmount,
          description: `Cashback: ${remarks}`,
        });
      if (txnError) throw txnError;

      toast({
        title: "Success",
        description: `₹${topUpAmount} added to ${userName}'s wallet`,
      });

      setAmount("");
      setRemarks("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding wallet balance:', error);
      toast({
        title: "Error",
        description: "Failed to add wallet balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Add Wallet Balance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">User</p>
                <p className="font-medium">{userName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="font-semibold text-lg flex items-center justify-end">
                  <IndianRupee className="h-4 w-4" />
                  {currentBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks *</Label>
            <Textarea
              id="remarks"
              placeholder="Enter remarks for this transaction (e.g., Promotional cashback, Refund, etc.)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleTopUp} disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Balance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
