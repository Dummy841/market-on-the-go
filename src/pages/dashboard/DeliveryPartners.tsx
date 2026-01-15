import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, UserCheck, Truck, MoreHorizontal, Edit, Power } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CreateDeliveryPartnerForm from "@/components/CreateDeliveryPartnerForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface DeliveryPartner {
  id: string;
  name: string;
  mobile: string;
  profile_photo_url: string | null;
  is_active: boolean;
  is_online: boolean;
  created_at: string;
}

const DeliveryPartners = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    active: 0
  });
  const { toast } = useToast();

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery partners:', error);
        return;
      }

      const partnersData = data || [];
      setPartners(partnersData);

      const total = partnersData.length;
      const online = partnersData.filter(p => p.is_online).length;
      const active = partnersData.filter(p => p.is_active).length;

      setStats({ total, online, active });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePartnerActive = async (partnerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('delivery_partners')
        .update({ is_active: !currentStatus })
        .eq('id', partnerId);

      if (error) throw error;

      await fetchPartners();
      toast({
        title: "Success",
        description: `Partner ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating partner status:', error);
      toast({
        title: "Error",
        description: "Failed to update partner status",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleCreateSuccess = () => {
    fetchPartners();
    setShowCreateForm(false);
    setEditingPartner(null);
    toast({
      title: "Success",
      description: editingPartner ? "Delivery partner updated successfully" : "Delivery partner created successfully",
    });
  };

  const handleEdit = (partner: DeliveryPartner) => {
    setEditingPartner(partner);
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingPartner(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Delivery Partners Management</h2>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Partner
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Total Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Registered partners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Online Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.online}</p>
            <p className="text-sm text-muted-foreground">Available for delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Active Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Delivery Partners</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No delivery partners found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={partner.profile_photo_url || ''} />
                          <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{partner.mobile}</TableCell>
                    <TableCell>
                      <Badge variant={partner.is_active ? "default" : "secondary"}>
                        {partner.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.is_online ? "default" : "outline"}>
                        {partner.is_online ? "Online" : "Offline"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(partner.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(partner)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => togglePartnerActive(partner.id, partner.is_active)}
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {partner.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateDeliveryPartnerForm
        open={showCreateForm}
        onOpenChange={handleCloseForm}
        onSuccess={handleCreateSuccess}
        editingPartner={editingPartner}
      />
    </div>
  );
};

export default DeliveryPartners;