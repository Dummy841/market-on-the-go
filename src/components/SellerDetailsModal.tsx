import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Seller } from '@/contexts/SellerAuthContext';
import { MapPin, Phone, CreditCard, Building, Percent } from 'lucide-react';

interface SellerDetailsModalProps {
  seller: Seller | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SellerDetailsModal = ({ seller, open, onOpenChange }: SellerDetailsModalProps) => {
  if (!seller) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seller Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header with Avatar and Basic Info */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={seller.profile_photo_url || ''} />
              <AvatarFallback className="text-lg">
                {seller.seller_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{seller.seller_name}</h3>
              <p className="text-muted-foreground">Owner: {seller.owner_name}</p>
              <p className="text-sm text-muted-foreground">ID: {seller.seller_id || 'Not assigned'}</p>
              <Badge className={`mt-2 ${getStatusColor(seller.status)}`}>
                {seller.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Mobile Number</p>
                  <p className="text-muted-foreground">{seller.mobile}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Online Status</p>
                  <Badge variant={seller.is_online ? "default" : "secondary"}>
                    {seller.is_online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            {(seller.seller_latitude || seller.seller_longitude) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Coordinates</p>
                    <p className="text-muted-foreground">
                      {seller.seller_latitude?.toFixed(6)}, {seller.seller_longitude?.toFixed(6)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bank Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Bank Name</p>
                  <p className="text-muted-foreground">{seller.bank_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Account Number</p>
                  <p className="text-muted-foreground">{seller.account_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">IFSC Code</p>
                  <p className="text-muted-foreground">{seller.ifsc_code}</p>
                </div>
              </CardContent>
            </Card>

            {/* Business Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Registration Date</p>
                  <p className="text-muted-foreground">
                    {new Date(seller.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-muted-foreground">
                    {new Date(seller.updated_at).toLocaleDateString()}
                  </p>
                </div>
                {seller.franchise_percentage !== undefined && (
                  <div>
                    <p className="text-sm font-medium flex items-center">
                      <Percent className="w-4 h-4 mr-1" />
                      Franchise Percentage
                    </p>
                    <p className="text-muted-foreground">{seller.franchise_percentage}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellerDetailsModal;