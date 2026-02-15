import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Plus, 
  Home,
  Building2,
  Briefcase,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserAuth } from '@/contexts/UserAuthContext';
import FullScreenLocationPicker from '@/components/FullScreenLocationPicker';
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
  house_number?: string;
  apartment_area?: string;
  area?: string;
}

interface AddressSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddressSelect: (address: SavedAddress) => void;
  selectedAddress?: SavedAddress;
}

const normalizeSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();

// When editing, saved `full_address` already contains house/apartment/village.
// We need to pass only the base (geocoded) part to the form to avoid re-prepending and creating duplicates.
const stripAddressPrefix = (fullAddress: string, parts: Array<string | undefined | null>) => {
  let result = normalizeSpaces(fullAddress || "");

  const cleanParts = parts
    .map((p) => normalizeSpaces(String(p ?? "")))
    .filter(Boolean);

  if (cleanParts.length === 0) return result;

  // Try to strip "house, apartment, village," prefix if present
  const prefix = cleanParts.join(", ");
  const lowerResult = result.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();

  if (lowerResult.startsWith(lowerPrefix + ",")) {
    result = result.slice(prefix.length + 1).trim(); // remove prefix + comma
  } else if (lowerResult.startsWith(lowerPrefix)) {
    result = result.slice(prefix.length).trim();
  }

  // Clean leading comma/space leftovers
  result = result.replace(/^[,\s]+/, "");
  return result;
};

const AddressSelector = ({ 
  open, 
  onOpenChange, 
  onAddressSelect, 
  selectedAddress 
}: AddressSelectorProps) => {
  const { user } = useUserAuth();
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
        house_number: addr.house_number,
        apartment_area: addr.apartment_area,
        area: addr.area,
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

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
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
    const addressData = {
      label: address.label,
      address: address.address,
      latitude: address.latitude,
      longitude: address.longitude
    };
    
    // Store in localStorage for persistence across pages (including coordinates)
    localStorage.setItem('selectedAddress', JSON.stringify(addressData));
    
    // Dispatch custom event to notify other components about address change
    console.log('AddressSelector dispatching addressChanged event:', addressData);
    window.dispatchEvent(new CustomEvent('addressChanged', { detail: addressData }));
    
    onAddressSelect(address);
    onOpenChange(false);
  };

  const handleEditAddress = (address: SavedAddress, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddress(address);

    const baseAddress = stripAddressPrefix(address.address, [
      address.house_number,
      address.apartment_area,
      address.area,
    ]);

    setSelectedLocation({
      latitude: address.latitude!,
      longitude: address.longitude!,
      address: baseAddress
    });
    setShowAddressForm(true);
  };

  return (
    <>
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
            {/* Action Buttons */}
            <div className="px-4 py-4">
              <div className="grid grid-cols-2 gap-3">
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
                  <div className="p-2 bg-muted rounded-full">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-center">
                    Add New Address
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
                            <DropdownMenuContent align="end" className="z-[9999]">
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
      </Dialog>

      {/* Full Screen Location Picker - Rendered via Portal to ensure it's on top */}
      {showLocationPicker && createPortal(
        <FullScreenLocationPicker
          open={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onLocationSelect={handleLocationSelect}
        />,
        document.body
      )}

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
    </>
  );
};

export default AddressSelector;