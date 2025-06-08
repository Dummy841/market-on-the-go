
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from '@/components/ui/use-toast';
import { Farmer, Transaction } from '@/utils/types';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

interface SettlementModalProps {
  farmer: Farmer;
  unsettledAmount: number;
  open: boolean;
  onClose: () => void;
  onSettle: () => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ 
  farmer, 
  unsettledAmount, 
  open, 
  onClose, 
  onSettle 
}) => {
  const { toast } = useToast();

  const handleSettle = () => {
    onSettle();
    toast({
      title: "Payment Settled",
      description: `Successfully settled payment of ₹${unsettledAmount.toFixed(2)} to ${farmer.name}`,
    });
    onClose();
  };

  // Get unsettled transactions
  const unsettledTransactions = farmer.transactions?.filter(
    t => t.type === 'credit' && !t.settled
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle Payment</DialogTitle>
          <DialogDescription>
            You are about to settle the payment for {farmer.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex justify-between items-center mb-4 p-3 bg-agri-muted rounded-md">
            <span className="font-medium">Total Amount to Settle:</span>
            <span className="text-lg font-bold text-agri-primary">₹{unsettledAmount.toFixed(2)}</span>
          </div>
          
          <h4 className="text-sm font-medium mb-2">Payment will be sent to:</h4>
          <div className="space-y-2 p-3 border rounded-md">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Account Holder:</span>
              <span>{farmer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Bank:</span>
              <span>{farmer.bank_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Account Number:</span>
              <span>{farmer.account_number}</span>
            </div>
            {farmer.ifsc_code && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">IFSC Code:</span>
                <span>{farmer.ifsc_code}</span>
              </div>
            )}
          </div>
          
          {unsettledTransactions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Unsettled Transactions:</h4>
              <div className="border rounded-md max-h-40 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="text-left p-2 text-xs">Date</th>
                      <th className="text-left p-2 text-xs">Description</th>
                      <th className="text-right p-2 text-xs">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {unsettledTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b">
                        <td className="p-2">{format(transaction.date, 'MMM dd, yyyy')}</td>
                        <td className="p-2">{transaction.description}</td>
                        <td className="text-right p-2">₹{transaction.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSettle} 
            className="bg-agri-primary hover:bg-agri-secondary"
            disabled={unsettledAmount <= 0}
          >
            <Check className="mr-2 h-4 w-4" /> Confirm Settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettlementModal;
