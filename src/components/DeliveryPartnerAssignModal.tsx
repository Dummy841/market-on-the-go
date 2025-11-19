import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, User } from "lucide-react";

interface DeliveryPartner {
  id: string;
  name: string;
  mobile: string;
  profile_photo_url?: string;
  is_online: boolean;
}

interface DeliveryPartnerAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onAssignSuccess: () => void;
}

const DeliveryPartnerAssignModal = ({ 
  isOpen, 
  onClose, 
  orderId, 
  onAssignSuccess 
}: DeliveryPartnerAssignModalProps) => {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDeliveryPartners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('is_active', true)
        .order('is_online', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching delivery partners:', error);
      toast({
        title: "Error",
        description: "Failed to fetch delivery partners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignPartner = async (partnerId: string) => {
    try {
      setAssigning(partnerId);
      const { error } = await supabase
        .from('orders')
        .update({ 
          assigned_delivery_partner_id: partnerId,
          assigned_at: new Date().toISOString(),
          status: 'assigned'
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order assigned to delivery partner successfully",
      });
      
      onAssignSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning order:', error);
      toast({
        title: "Error",
        description: "Failed to assign order",
        variant: "destructive",
      });
    } finally {
      setAssigning(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeliveryPartners();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Assign Delivery Partner
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-muted rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No delivery partners available</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {partners.map((partner) => (
                <Card key={partner.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={partner.profile_photo_url} alt={partner.name} />
                          <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{partner.name}</h3>
                          <p className="text-sm text-muted-foreground">{partner.mobile}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={partner.is_online ? "default" : "secondary"}
                          className={partner.is_online ? "bg-green-100 text-green-800" : ""}
                        >
                          {partner.is_online ? "Online" : "Offline"}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => assignPartner(partner.id)}
                          disabled={assigning === partner.id}
                        >
                          {assigning === partner.id ? "Assigning..." : "Assign"}
                        </Button>
                      </div>
                    </div>
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

export default DeliveryPartnerAssignModal;