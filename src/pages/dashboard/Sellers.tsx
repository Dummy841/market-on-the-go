import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Eye, Edit, DollarSign, CreditCard, MoreVertical, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CreateSellerForm from '@/components/CreateSellerForm';
import SellerDetailsModal from '@/components/SellerDetailsModal';
import EditSellerModal from '@/components/EditSellerModal';
import SellerSettlementsModal from '@/components/SellerSettlementsModal';
import { Seller } from '@/contexts/SellerAuthContext';

const Sellers = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettlementsModal, setShowSettlementsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0
  });
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchSellers();
  }, []);
  const fetchSellers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('sellers').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setSellers((data || []) as Seller[]);

      // Calculate stats
      const total = data?.length || 0;
      const active = data?.filter(s => s.status === 'approved').length || 0;
      const pending = data?.filter(s => s.status === 'pending').length || 0;
      setStats({
        total,
        active,
        pending
      });
    } catch (error) {
      console.error('Error fetching sellers:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch sellers"
      });
    } finally {
      setLoading(false);
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'Active';
      case 'pending':
      case 'inactive':
        return 'Inactive';
      default:
        return status;
    }
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Sellers Management</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Seller
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by seller name, owner name, or mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>


      <Card>
        <CardHeader>
          <CardTitle>All Sellers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-4">Loading...</div> : (() => {
            const filteredSellers = sellers.filter(seller => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                seller.seller_name.toLowerCase().includes(query) ||
                seller.owner_name.toLowerCase().includes(query) ||
                seller.mobile.includes(query)
              );
            });
            
            return filteredSellers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No sellers match your search.' : 'No sellers found. Create your first seller to get started.'}
              </div>
            ) : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller ID</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSellers.map(seller => <TableRow key={seller.id}>
                    <TableCell className="font-mono text-sm">
                      {seller.seller_id || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={seller.profile_photo_url} />
                          <AvatarFallback>
                            {seller.seller_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{seller.seller_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {seller.seller_name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{seller.owner_name}</TableCell>
                    <TableCell>{seller.mobile}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{seller.bank_name}</div>
                        <div className="text-muted-foreground">
                          {seller.account_number} • {seller.ifsc_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${seller.status === 'approved' || seller.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                        {getStatusText(seller.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                      setSelectedSeller(seller);
                      setShowDetailsModal(true);
                    }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                      setSelectedSeller(seller);
                      setShowEditModal(true);
                    }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Seller
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/sellers/${seller.id}/sales`)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            View Sales
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                      setSelectedSeller(seller);
                      setShowSettlementsModal(true);
                    }}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Settlements
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>;
          })()}
        </CardContent>
      </Card>

      <CreateSellerForm open={showCreateForm} onOpenChange={setShowCreateForm} onSuccess={fetchSellers} />

      <SellerDetailsModal seller={selectedSeller} open={showDetailsModal} onOpenChange={setShowDetailsModal} />

      <EditSellerModal seller={selectedSeller} open={showEditModal} onOpenChange={setShowEditModal} onSuccess={fetchSellers} />

      <SellerSettlementsModal seller={selectedSeller} open={showSettlementsModal} onOpenChange={setShowSettlementsModal} />
    </div>;
};
export default Sellers;