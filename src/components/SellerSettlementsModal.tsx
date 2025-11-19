import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Seller } from '@/contexts/SellerAuthContext';
import { CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Settlement {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  reference_id: string;
}

interface SellerSettlementsModalProps {
  seller: Seller | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SellerSettlementsModal = ({ seller, open, onOpenChange }: SellerSettlementsModalProps) => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSettled: 0,
    pendingAmount: 0,
    lastSettlement: null as string | null
  });
  const { toast } = useToast();

  useEffect(() => {
    if (seller && open) {
      fetchSettlements();
    }
  }, [seller, open]);

  // Mock settlement data since settlements table doesn't exist in the schema
  const fetchSettlements = async () => {
    if (!seller) return;

    setLoading(true);
    try {
      // Simulating settlements based on completed orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', seller.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mock settlement data based on orders
      const mockSettlements: Settlement[] = orders?.map((order, index) => ({
        id: `STL${Date.now()}${index}`,
        amount: order.total_amount * 0.8, // 80% after platform fee
        status: index < 2 ? 'completed' : index < 4 ? 'processing' : 'pending',
        created_at: order.created_at,
        processed_at: index < 2 ? new Date(new Date(order.created_at).getTime() + 24*60*60*1000).toISOString() : undefined,
        reference_id: `REF${order.id.substring(0, 8)}`
      })) || [];

      setSettlements(mockSettlements);

      // Calculate stats
      const totalSettled = mockSettlements
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + s.amount, 0);
      
      const pendingAmount = mockSettlements
        .filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + s.amount, 0);

      const lastSettlement = mockSettlements
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.processed_at || b.created_at).getTime() - new Date(a.processed_at || a.created_at).getTime())[0]?.processed_at || null;

      setStats({
        totalSettled,
        pendingAmount,
        lastSettlement
      });

    } catch (error) {
      console.error('Error fetching settlements:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch settlement data",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleInitiateSettlement = () => {
    toast({
      title: "Settlement Initiated",
      description: "Settlement process has been initiated. It will be processed within 24-48 hours.",
    });
  };

  if (!seller) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settlements - {seller.seller_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Total Settled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalSettled)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                  Pending Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(stats.pendingAmount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Last Settlement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {stats.lastSettlement 
                    ? new Date(stats.lastSettlement).toLocaleDateString()
                    : 'No settlements yet'
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Settlement History</h3>
              <p className="text-sm text-muted-foreground">View all settlement transactions</p>
            </div>
            {stats.pendingAmount > 0 && (
              <Button onClick={handleInitiateSettlement}>
                Initiate Settlement
              </Button>
            )}
          </div>

          {/* Settlements Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-4">Loading settlements...</div>
              ) : settlements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No settlements found for this seller.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Processed At</TableHead>
                      <TableHead>Bank Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {settlement.reference_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(settlement.amount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(settlement.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(settlement.status)}
                            {settlement.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(settlement.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {settlement.processed_at 
                            ? new Date(settlement.processed_at).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{seller.bank_name}</div>
                            <div className="text-muted-foreground">
                              ****{seller.account_number.slice(-4)}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellerSettlementsModal;