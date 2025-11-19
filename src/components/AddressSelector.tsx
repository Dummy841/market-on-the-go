import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Plus, 
  MessageSquare,
  Home,
  Building2,
  Briefcase,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserAuth } from '@/contexts/UserAuthContext';
import LocationPicker from '@/components/LocationPicker';
import AddressDetailsForm from '@/components/AddressDetailsForm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  distance?: string;
  isSelected?: boolean;
  latitude?: number;
  longitude?: number;
  mobile?: string;
}

interface AddressSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddressSelect: (address: SavedAddress) => void;
  selectedAddress?: SavedAddress;
}

const AddressSelector = ({ 
  open, 
  onOpenChange, 
  onAddressSelect, 
  selectedAddress 
}: AddressSelectorProps) => {
  const { user } = useUserAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // Load saved addresses when component opens
  useEffect(() => {
    if (open && user) {
      loadSavedAddresses();
    }
  }, [open, user]);

  const loadSavedAddresses = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const addresses: SavedAddress[] = data?.map(addr => ({
        id: addr.id,
        label: addr.label,
        address: addr.full_address,
        latitude: parseFloat(addr.latitude.toString()),
        longitude: parseFloat(addr.longitude.toString()),
        mobile: addr.mobile,
      })) || [];

      setSavedAddresses(addresses);
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load saved addresses.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setShowLocationPicker(true);
  };

  const handleAddNewAddress = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    // Create a reverse geocoded address (simplified)
    const address = `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      address: address
    });
    
    setShowLocationPicker(false);
    setShowAddressForm(true);
  };

  const handleAddressSaved = (address: SavedAddress) => {
    // Reload addresses to include the new one
    loadSavedAddresses();
    
    // Select the new address
    onAddressSelect(address);
    onOpenChange(false);
  };

  const handleDeleteAddress = async (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Address Deleted",
        description: "Address has been removed successfully.",
      });

      // Reload addresses
      loadSavedAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete address. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAddressIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home')) return <Home className="h-4 w-4" />;
    if (lowerLabel.includes('work') || lowerLabel.includes('office')) return <Briefcase className="h-4 w-4" />;
    if (lowerLabel.includes('hotel')) return <Building2 className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  const handleAddressSelect = (address: SavedAddress) => {
    // Store in localStorage for persistence across pages
    localStorage.setItem('selectedAddress', JSON.stringify({
      label: address.label,
      address: address.address
    }));
    onAddressSelect(address);
    onOpenChange(false);
  };

  const handleEditAddress = (address: SavedAddress, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddress(address);
    setSelectedLocation({
      latitude: address.latitude!,
      longitude: address.longitude!,
      address: address.address
    });
    setShowAddressForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-0 border-b">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DialogTitle className="text-lg font-semibold">Select Your Location</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Search Bar */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search an area or address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-xl bg-muted/50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 rounded-xl"
                onClick={handleUseCurrentLocation}
                disabled={isGettingLocation}
              >
                <div className="p-2 bg-orange-100 rounded-full">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-center">
                  {isGettingLocation ? 'Getting...' : 'Use Current Location'}
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 rounded-xl"
                onClick={handleAddNewAddress}
              >
                <div className="p-2 bg-gray-100 rounded-full">
                  <Plus className="h-5 w-5 text-gray-600" />
                </div>
                <span className="text-xs font-medium text-center">
                  Add New Address
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 rounded-xl"
              >
                <div className="p-2 bg-green-100 rounded-full">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-xs font-medium text-center">
                  Request Address
                </span>
              </Button>
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="px-4 pb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              SAVED ADDRESSES
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : savedAddresses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved addresses yet</p>
                <p className="text-xs">Add your first address to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((address) => (
                  <Card
                    key={address.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedAddress?.id === address.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleAddressSelect(address)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-full mt-1">
                          {getAddressIcon(address.label)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{address.label}</span>
                            {selectedAddress?.id === address.id && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                SELECTED
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {address.address}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-auto">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => handleEditAddress(address, e)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Address
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteAddress(address.id, e)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Address
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </DialogContent>

      {/* Location Picker Modal */}
      <LocationPicker
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        onLocationSelect={handleLocationSelect}
      />

      {/* Address Details Form Modal */}
      <AddressDetailsForm
        open={showAddressForm}
        onOpenChange={(open) => {
          setShowAddressForm(open);
          if (!open) setEditingAddress(null);
        }}
        onAddressSaved={handleAddressSaved}
        selectedLocation={selectedLocation}
        editingAddress={editingAddress}
      />
    </Dialog>
  );
};

export default AddressSelector;