
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import Sidebar from '@/components/Sidebar';
import ProductForm from '@/components/ProductForm';
import TransactionHistory from '@/components/TransactionHistory';
import SettlementModal from '@/components/SettlementModal';
import { mockFarmers, getDailyEarnings, getMonthlyEarnings, getUnsettledAmount } from '@/utils/mockData';
import { Farmer, Product, Transaction } from '@/utils/types';
import { ArrowLeft, Plus, DollarSign, Edit } from 'lucide-react';
import { format } from 'date-fns';

const FarmerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [dailyEarnings, setDailyEarnings] = useState([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState([]);
  const [unsettledAmount, setUnsettledAmount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  useEffect(() => {
    if (id) {
      const foundFarmer = mockFarmers.find(farmer => farmer.id === id);
      if (foundFarmer) {
        setFarmer(foundFarmer);
        setDailyEarnings(getDailyEarnings(id));
        setMonthlyEarnings(getMonthlyEarnings(id));
        setUnsettledAmount(getUnsettledAmount(id));
      } else {
        toast({
          title: "Farmer not found",
          description: "The requested farmer could not be found.",
          variant: "destructive"
        });
        navigate('/farmers');
      }
    }
  }, [id, navigate, toast]);
  
  const handleProductSubmit = (product: Product) => {
    if (!farmer) return;
    
    if (selectedProduct) {
      // Update existing product
      const updatedProducts = farmer.products.map(p => 
        p.id === product.id ? product : p
      );
      
      // Update farmer state with updated products
      const updatedFarmer = { 
        ...farmer, 
        products: updatedProducts
      };
      
      setFarmer(updatedFarmer);
      setSelectedProduct(undefined);
      setIsProductDialogOpen(false);
      
      toast({
        title: "Product Updated",
        description: `Updated ${product.name} successfully`,
      });
    } else {
      // Add new product
      // Add product to farmer
      const updatedFarmer = { 
        ...farmer, 
        products: [...farmer.products, product] 
      };
      
      // Create transaction for the product
      const transaction: Transaction = {
        id: `tr_${Date.now()}`,
        amount: product.quantity * product.price_per_unit,
        date: new Date(),
        type: 'credit',
        description: `${product.name} delivery`,
        farmerId: farmer.id,
        settled: false
      };
      
      updatedFarmer.transactions = [...farmer.transactions, transaction];
      
      // Update farmer state
      setFarmer(updatedFarmer);
      setIsProductDialogOpen(false);
      
      // Update earnings and unsettled amount
      setDailyEarnings(getDailyEarnings(farmer.id));
      setMonthlyEarnings(getMonthlyEarnings(farmer.id));
      setUnsettledAmount(prev => prev + (product.quantity * product.price_per_unit));
      
      toast({
        title: "Product Added",
        description: `Added ${product.quantity} ${product.unit} of ${product.name} for ₹${(product.quantity * product.price_per_unit).toFixed(2)}`,
      });
    }
  };
  
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductDialogOpen(true);
  };
  
  const handleSettlePayment = () => {
    if (!farmer) return;
    
    // Create a settlement transaction
    const settlementTransaction: Transaction = {
      id: `tr_${Date.now()}`,
      amount: unsettledAmount,
      date: new Date(),
      type: 'debit',
      description: 'Payment settled',
      farmerId: farmer.id,
      settled: true
    };
    
    // Mark all unsettled transactions as settled
    const updatedTransactions = farmer.transactions.map(t => 
      t.type === 'credit' && !t.settled ? { ...t, settled: true } : t
    );
    
    // Update farmer with new transaction and settled status
    const updatedFarmer = {
      ...farmer,
      transactions: [...updatedTransactions, settlementTransaction]
    };
    
    setFarmer(updatedFarmer);
    setUnsettledAmount(0);
  };
  
  if (!farmer) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar />
          <main className="flex-1 p-6 flex items-center justify-center">
            <p>Loading farmer details...</p>
          </main>
        </div>
      </SidebarProvider>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/farmers')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Farmer Details</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{farmer.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="border-agri-primary text-agri-primary hover:bg-agri-muted"
                      onClick={() => {
                        setSelectedProduct(undefined);
                        setIsProductDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                    <Button 
                      className="bg-agri-primary hover:bg-agri-secondary"
                      onClick={() => setIsSettlementOpen(true)}
                      disabled={unsettledAmount <= 0}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Settle Payment
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Phone:</span>
                        <span>{farmer.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Address:</span>
                        <span className="text-right">{farmer.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Joined:</span>
                        <span>{format(new Date(farmer.date_joined), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Payment Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Bank:</span>
                        <span>{farmer.bank_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Account:</span>
                        <span>{farmer.account_number}</span>
                      </div>
                      {farmer.ifsc_code && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">IFSC:</span>
                          <span>{farmer.ifsc_code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">Unsettled Amount</p>
                  <p className="text-3xl font-bold text-agri-primary">₹{unsettledAmount.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Products</p>
                    <p className="text-xl font-semibold">{farmer.products.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-xl font-semibold">{farmer.transactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-6 mb-6">
            <Tabs defaultValue="products">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="products" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {farmer.products.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">No products added yet.</p>
                        <Button 
                          className="mt-2 bg-agri-primary hover:bg-agri-secondary"
                          onClick={() => setIsProductDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Product</th>
                              <th className="text-left p-2">Category</th>
                              <th className="text-left p-2">Date</th>
                              <th className="text-right p-2">Quantity</th>
                              <th className="text-right p-2">Unit Price (₹)</th>
                              <th className="text-right p-2">Total (₹)</th>
                              <th className="text-center p-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {farmer.products.map((product) => (
                              <tr key={product.id} className="border-b">
                                <td className="p-2">{product.name}</td>
                                <td className="p-2">{product.category || 'N/A'}</td>
                                <td className="p-2">{format(new Date(product.created_at), 'MMM dd, yyyy')}</td>
                                <td className="text-right p-2">{product.quantity} {product.unit}</td>
                                <td className="text-right p-2">₹{product.price_per_unit.toFixed(2)}</td>
                                <td className="text-right p-2 font-medium">
                                  ₹{(product.quantity * product.price_per_unit).toFixed(2)}
                                </td>
                                <td className="text-center p-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="transactions" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {farmer.transactions.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">No transactions yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Description</th>
                              <th className="text-center p-2">Type</th>
                              <th className="text-center p-2">Status</th>
                              <th className="text-right p-2">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...farmer.transactions]
                              .sort((a, b) => b.date.getTime() - a.date.getTime())
                              .map((transaction) => (
                                <tr key={transaction.id} className="border-b">
                                  <td className="p-2">{format(transaction.date, 'MMM dd, yyyy')}</td>
                                  <td className="p-2">{transaction.description}</td>
                                  <td className="text-center p-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      transaction.type === 'credit' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                                    </span>
                                  </td>
                                  <td className="text-center p-2">
                                    {transaction.type === 'credit' && (
                                      <span className={`px-2 py-1 rounded-full text-xs ${
                                        transaction.settled 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {transaction.settled ? 'Settled' : 'Pending'}
                                      </span>
                                    )}
                                  </td>
                                  <td className={`text-right p-2 font-medium ${
                                    transaction.type === 'credit' 
                                      ? 'text-green-600' 
                                      : 'text-red-600'
                                  }`}>
                                    {transaction.type === 'credit' ? '+' : '-'}
                                    ₹{transaction.amount.toFixed(2)}
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <TransactionHistory 
            transactions={farmer.transactions} 
            dailyEarnings={dailyEarnings} 
            monthlyEarnings={monthlyEarnings} 
          />
          
          <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
            setIsProductDialogOpen(open);
            if (!open) setSelectedProduct(undefined);
          }}>
            <DialogContent>
              <ProductForm 
                farmerId={farmer.id} 
                onSubmit={handleProductSubmit} 
                onCancel={() => {
                  setIsProductDialogOpen(false);
                  setSelectedProduct(undefined);
                }}
                editProduct={selectedProduct}
              />
            </DialogContent>
          </Dialog>
          
          <SettlementModal 
            farmer={farmer}
            unsettledAmount={unsettledAmount}
            open={isSettlementOpen}
            onClose={() => setIsSettlementOpen(false)}
            onSettle={handleSettlePayment}
          />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default FarmerDetails;
