import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, Search, Crosshair } from 'lucide-react';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { supabase } from '@/integrations/supabase/client';

interface FullScreenLocationPickerProps {
  open: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const FullScreenLocationPicker = ({ 
  open, 
  onClose, 
  onLocationSelect, 
  initialLat = 28.6139, 
  initialLng = 77.2090 
}: FullScreenLocationPickerProps) => {
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const { isLoaded } = useGoogleMaps();
  
  // Get current location when component opens
  useEffect(() => {
    if (open && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedLat(latitude);
          setSelectedLng(longitude);
          reverseGeocode(latitude, longitude);
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting current location:', error);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, [open]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // First try Google Maps Geocoding API for more accurate results
      try {
        const { data: keyData } = await supabase.functions.invoke('get-google-maps-key');
        if (keyData?.apiKey) {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${keyData.apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              // Find the locality/sublocality from address components
              const addressComponents = data.results[0].address_components;
              const locality = addressComponents?.find((c: any) => 
                c.types.includes('locality') || c.types.includes('sublocality') || c.types.includes('sublocality_level_1')
              );
              const area = addressComponents?.find((c: any) => 
                c.types.includes('neighborhood') || c.types.includes('sublocality_level_2')
              );
              const state = addressComponents?.find((c: any) => c.types.includes('administrative_area_level_1'));
              const country = addressComponents?.find((c: any) => c.types.includes('country'));
              const postalCode = addressComponents?.find((c: any) => c.types.includes('postal_code'));
              
              // Get detailed area name
              const areaName = area?.long_name || locality?.long_name || "Selected Location";
              const fullAddress = `${areaName}, ${state?.short_name || ''} ${postalCode?.long_name || ''}, ${country?.long_name || ''}`.replace(/,\s*,/g, ',').trim();
              
              setLocationName(areaName);
              setLocationAddress(fullAddress);
              return;
            }
          }
        }
      } catch (gmError) {
        console.log('Google Maps geocoding failed, falling back to Nominatim:', gmError);
      }
      
      // Fallback to Nominatim for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'accept-language': 'en' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        
        // Priority order: hamlet > village > locality > neighbourhood > suburb > town > city
        const areaName = address?.hamlet || 
                         address?.village || 
                         address?.locality ||
                         address?.neighbourhood ||
                         address?.suburb || 
                         address?.town ||
                         address?.city ||
                         "Selected Location";
        
        setLocationName(areaName);
        
        // Build full address
        const fullAddress = [
          areaName,
          address?.state,
          address?.postcode,
          address?.country
        ].filter(Boolean).join(', ');
        
        setLocationAddress(fullAddress);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setLocationName('Selected Location');
      setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setSelectedLat(lat);
      setSelectedLng(lng);
      reverseGeocode(lat, lng);
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setSelectedLat(lat);
      setSelectedLng(lng);
      reverseGeocode(lat, lng);
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLat, selectedLng, locationAddress || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`);
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedLat(latitude);
          setSelectedLng(longitude);
          reverseGeocode(latitude, longitude);
          
          if (map) {
            map.panTo({ lat: latitude, lng: longitude });
            map.setZoom(16);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting current location:', error);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Header with Search */}
      <div className="bg-background p-4 flex items-center gap-3 border-b">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="h-10 w-10 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search an area or address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-full bg-muted/50"
          />
        </div>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative">
        {!isLoaded ? (
          <div className="h-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: selectedLat, lng: selectedLng }}
              zoom={16}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={handleMapClick}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              <Marker
                position={{ lat: selectedLat, lng: selectedLng }}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(50, 50)
                }}
              />
            </GoogleMap>
            
            {/* Current Location Button */}
            <Button
              onClick={handleCurrentLocation}
              disabled={isLocating}
              variant="outline"
              className="absolute bottom-44 left-1/2 -translate-x-1/2 bg-background shadow-lg rounded-full px-4 h-10"
            >
              <Crosshair className={`h-4 w-4 mr-2 ${isLocating ? 'animate-pulse' : ''}`} style={{ color: 'hsl(var(--primary))' }} />
              <span>Current location</span>
            </Button>
          </>
        )}
      </div>
      
      {/* Bottom Sheet */}
      <div className="bg-background rounded-t-3xl shadow-2xl p-5 pb-8">
        <p className="text-sm text-muted-foreground mb-1">Place the pin at exact delivery location</p>
        <p className="text-xs text-muted-foreground mb-3">Order will be delivered here</p>
        
        <div className="flex items-start gap-3 mb-5">
          <MapPin className="h-6 w-6 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{locationName || 'Loading...'}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{locationAddress}</p>
          </div>
        </div>
        
        <Button 
          onClick={handleConfirm}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-medium rounded-xl"
        >
          Confirm & proceed
        </Button>
      </div>
    </div>
  );
};

export default FullScreenLocationPicker;
