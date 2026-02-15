import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, Home, Briefcase, Users, MapPin } from 'lucide-react';
import { registerOverlayForBackButton } from '@/hooks/useAndroidBackButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserAuth } from '@/contexts/UserAuthContext';

const VILLAGE_OPTIONS = ['Atmakur', 'Dudyala', 'Karivena'];

const normalizeSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();

// Removes "house, apartment, village" prefix from a full address when present.
// This prevents duplicates when editing, because saved `full_address` already includes these parts.
const stripAddressPrefix = (fullAddress: string, parts: Array<string | undefined | null>) => {
  let result = normalizeSpaces(fullAddress || "");
  const cleanParts = parts
    .map((p) => normalizeSpaces(String(p ?? "")))
    .filter(Boolean);

  if (cleanParts.length === 0) return result;

  const prefix = cleanParts.join(", ");
  const lowerResult = result.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();

  if (lowerResult.startsWith(lowerPrefix + ",")) {
    result = result.slice(prefix.length + 1).trim();
  } else if (lowerResult.startsWith(lowerPrefix)) {
    result = result.slice(prefix.length).trim();
  }

  return result.replace(/^[,\s]+/, "");
};
interface AddressDetailsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddressSaved: (address: any) => void;
  selectedLocation: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  editingAddress?: {
    id: string;
    label: string;
    address: string;
    latitude?: number;
    longitude?: number;
    mobile?: string;
    house_number?: string;
    apartment_area?: string;
    area?: string;
  } | null;
}
const AddressDetailsForm = ({
  open,
  onOpenChange,
  onAddressSaved,
  selectedLocation,
  editingAddress
}: AddressDetailsFormProps) => {
  const {
    user
  } = useUserAuth();
  const [houseNumber, setHouseNumber] = useState('');
  const [apartmentArea, setApartmentArea] = useState('');
  const [villageCity, setVillageCity] = useState('');
  const [directions, setDirections] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('Home');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingLabels, setExistingLabels] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [labelTouched, setLabelTouched] = useState(false);
  const labelTouchedRef = useRef(false);

  useEffect(() => {
    labelTouchedRef.current = labelTouched;
  }, [labelTouched]);

  // Register with Android back button handler
  useEffect(() => {
    if (!open) return;
    const unregister = registerOverlayForBackButton(() => onOpenChange(false));
    return unregister;
  }, [open, onOpenChange]);
  useEffect(() => {
    if (user?.mobile && !mobileNumber) {
      setMobileNumber(user.mobile);
    }
  }, [user]);

  // Load existing labels when dialog opens
  useEffect(() => {
    if (open && user) {
      loadExistingLabels();
    }
  }, [open, user]);

  // Initialize form when dialog opens - only once per open cycle
  useEffect(() => {
    if (!open) {
      // Reset initialization flag when dialog closes
      setIsInitialized(false);
      setLabelTouched(false);
      return;
    }

    // Only initialize once per open cycle
    if (isInitialized) return;

    if (editingAddress) {
      // Use stored values from database, not parsed from full_address
      setHouseNumber(editingAddress.house_number || '');
      setApartmentArea(editingAddress.apartment_area || '');
      setVillageCity(editingAddress.area || '');
      setSelectedLabel(editingAddress.label || 'Home');
      setMobileNumber(editingAddress.mobile || user?.mobile || '');
      setDirections('');
    } else {
      // Reset form for new address
      setHouseNumber('');
      setApartmentArea('');
      setVillageCity('');
      setDirections('');
      setSelectedLabel('Home');
      setMobileNumber(user?.mobile || '');
    }
    
    setIsInitialized(true);
  }, [open, editingAddress, user, isInitialized]);
  const loadExistingLabels = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('user_addresses').select('label').eq('user_id', user.id);
      if (error) throw error;
      const labels = data?.map(addr => addr.label) || [];
      setExistingLabels(labels);

      // Only auto-pick a label for *new* addresses and only if user hasn't interacted.
      if (!editingAddress && !labelTouchedRef.current) {
        const availableLabel = labelOptions.find(option => !labels.includes(option.value));
        if (availableLabel) {
          setSelectedLabel(availableLabel.value);
        }
      }
    } catch (error) {
      console.error('Error loading existing labels:', error);
    }
  };
  const labelOptions = [{
    value: 'Home',
    icon: Home,
    label: 'Home'
  }, {
    value: 'Work',
    icon: Briefcase,
    label: 'Work'
  }, {
    value: 'Friends and Family',
    icon: Users,
    label: 'Friends and Family'
  }, {
    value: 'Other',
    icon: MapPin,
    label: 'Other'
  }];
  const handleVoiceRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording functionality can be implemented later
    toast({
      title: "Voice Recording",
      description: "Voice recording feature will be available soon."
    });
  };
  const handleSaveAddress = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to save addresses.",
        variant: "destructive"
      });
      return;
    }
    if (!selectedLocation && !editingAddress) {
      toast({
        title: "Location Required",
        description: "Please select a location first.",
        variant: "destructive"
      });
      return;
    }
    if (!houseNumber.trim()) {
      toast({
        title: "House Number Required",
        description: "Please enter house/flat/block number.",
        variant: "destructive"
      });
      return;
    }
    try {
      setIsSaving(true);
      const locationData = selectedLocation || {
        latitude: editingAddress?.latitude!,
        longitude: editingAddress?.longitude!,
        address: editingAddress?.address!
      };
      
      // Build full address without duplicating house/apartment in the geocoded address
      // The geocoded address from location picker already contains the area details
      // We prepend house number and apartment to it
      // For edit flows, `locationData.address` might still contain the already-saved full_address.
      // Strip the current parts first so we don't keep appending duplicates.
      const geocodedAddress = stripAddressPrefix(locationData.address, [
        houseNumber,
        apartmentArea,
        villageCity,
      ]);
      
      // Remove any existing house number prefix from geocoded address to avoid duplication
      // The geocoded address typically starts with street details
      const fullAddress = `${houseNumber}${apartmentArea ? ', ' + apartmentArea : ''}${villageCity ? ', ' + villageCity : ''}, ${geocodedAddress}`;
      
      let data, error;
      if (editingAddress) {
        // Update existing address
        const result = await supabase.from('user_addresses').update({
          label: selectedLabel,
          house_number: houseNumber,
          apartment_area: apartmentArea || null,
          area: villageCity || null,
          directions: directions || null,
          mobile: mobileNumber,
          full_address: fullAddress,
          latitude: locationData.latitude,
          longitude: locationData.longitude
        }).eq('id', editingAddress.id).eq('user_id', user.id).select().single();
        data = result.data;
        error = result.error;
      } else {
        // Insert new address
        const result = await supabase.from('user_addresses').insert([{
          user_id: user.id,
          label: selectedLabel,
          house_number: houseNumber,
          apartment_area: apartmentArea || null,
          area: villageCity || null,
          directions: directions || null,
          mobile: mobileNumber,
          full_address: fullAddress,
          latitude: locationData.latitude,
          longitude: locationData.longitude
        }]).select().single();
        data = result.data;
        error = result.error;
      }
      if (error) throw error;
      const savedAddress = {
        id: data.id,
        label: data.label,
        address: data.full_address,
        latitude: data.latitude,
        longitude: data.longitude,
        mobile: data.mobile
      };
      onAddressSaved(savedAddress);
      onOpenChange(false);

      // Reset form
      setHouseNumber('');
      setApartmentArea('');
      setDirections('');
      setMobileNumber(user?.mobile || '');
      setSelectedLabel('Home');
      toast({
        title: editingAddress ? "Address Updated" : "Address Saved",
        description: editingAddress ? "Your address has been updated successfully." : "Your address has been saved successfully."
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save address. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="p-0 h-auto">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {editingAddress ? 'Edit Address' : selectedLocation?.address?.split(',')[0] || 'Address Details'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {editingAddress ? editingAddress.address : selectedLocation?.address}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Location Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800">
              A detailed address will help our Delivery Partner reach your doorstep easily
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* House Number */}
            <div className="space-y-2">
              <Label htmlFor="house" className="text-sm font-medium text-muted-foreground uppercase">
                HOUSE / FLAT / BLOCK NO.
              </Label>
              <Input id="house" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} placeholder="Enter house/flat/block number" className="h-12" />
            </div>

            {/* Apartment/Area */}
            <div className="space-y-2">
              <Label htmlFor="apartment" className="text-sm font-medium text-muted-foreground uppercase">
                APARTMENT / ROAD / AREA <span className="text-muted-foreground">(RECOMMENDED)</span>
              </Label>
              <Input id="apartment" value={apartmentArea} onChange={e => setApartmentArea(e.target.value)} placeholder="Enter apartment/road/area details" className="h-12" />
            </div>

            {/* Village/City */}
            <div className="space-y-2">
              <Label htmlFor="village" className="text-sm font-medium text-muted-foreground uppercase">
                VILLAGE / CITY
              </Label>
              <Select value={villageCity} onValueChange={setVillageCity}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select village/city" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-background">
                  {VILLAGE_OPTIONS.map((village) => (
                    <SelectItem key={village} value={village}>
                      {village}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-sm font-medium text-muted-foreground uppercase">
                MOBILE NUMBER
              </Label>
              <Input id="mobile" type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="Enter mobile number" className="h-12" />
            </div>

            {/* Directions */}
            

            {/* Save As */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground uppercase">
                SAVE AS
              </Label>
              
              <div className="grid grid-cols-2 gap-3">
                 {labelOptions.map(({
                value,
                icon: Icon,
                label
              }) => {
                const isUsed = existingLabels.includes(value);
                 return <Button key={value} variant={selectedLabel === value ? "default" : "outline"} className={`h-12 flex items-center gap-2 ${selectedLabel === value ? 'bg-primary text-primary-foreground' : isUsed ? 'text-muted-foreground opacity-50 cursor-not-allowed' : 'text-muted-foreground'}`} onClick={() => {
                   if (isUsed) return;
                   setLabelTouched(true);
                   setSelectedLabel(value);
                 }} disabled={isUsed}>
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{label}</span>
                      {isUsed && <span className="text-xs ml-1">(Used)</span>}
                    </Button>;
              })}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="p-4 border-t">
          <Button onClick={handleSaveAddress} disabled={isSaving || !houseNumber.trim() || !mobileNumber.trim()} className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium uppercase tracking-wide">
            {isSaving ? editingAddress ? 'Updating...' : 'Saving...' : editingAddress ? 'UPDATE ADDRESS' : 'SAVE ADDRESS'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};
export default AddressDetailsForm;