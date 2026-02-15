import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Locate } from 'lucide-react';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

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
  initialLat,
  initialLng 
}: FullScreenLocationPickerProps) => {
  // Use refs for values that change during map interaction to avoid re-render loops
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  // These refs track the current coordinates without triggering re-renders during drag
  const currentCoordsRef = useRef({ 
    lat: initialLat ?? 17.385044, 
    lng: initialLng ?? 78.486671 
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();

  // Handle back button for Android
  useEffect(() => {
    if (open) {
      (window as any).__locationPickerOpen = true;
      (window as any).__locationPickerClose = onClose;
    }
    return () => {
      (window as any).__locationPickerOpen = false;
      (window as any).__locationPickerClose = null;
    };
  }, [open, onClose]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      if (isLoaded && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });
        const first = result.results?.[0];

        if (first) {
          const comps = first.address_components || [];
          const pick = (types: string[]) =>
            comps.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

          const areaName = pick(["neighborhood", "sublocality", "sublocality_level_1"]) || pick(["locality"]) || "Selected Location";
          setLocationName(areaName);
          setLocationAddress(first.formatted_address);
          return;
        }
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  };

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Set the initial view once
    map.setCenter(currentCoordsRef.current);
    map.setZoom(17);
    reverseGeocode(currentCoordsRef.current.lat, currentCoordsRef.current.lng);
  }, [isLoaded]);

  const handleMapIdle = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (center) {
      const newLat = center.lat();
      const newLng = center.lng();
      
      // Only update and geocode if the center has actually moved significantly
      if (Math.abs(currentCoordsRef.current.lat - newLat) > 0.00001) {
        currentCoordsRef.current = { lat: newLat, lng: newLng };
        reverseGeocode(newLat, newLng);
      }
    }
  }, [isLoaded]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    onLocationSelect(
      currentCoordsRef.current.lat,
      currentCoordsRef.current.lng,
      locationAddress || "Selected Location"
    );
    onClose();
  };

  const handleLocateMe = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!navigator.geolocation) return;
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        currentCoordsRef.current = { lat: latitude, lng: longitude };
        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(17);
        }
        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col touch-none">
      {/* Header */}
      <div className="relative z-30 bg-background pt-[env(safe-area-inset-top)] px-3 pb-2 flex items-center gap-3 border-b">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Select Delivery Location</h1>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative bg-muted">
        {isLoaded ? (
          <>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              onLoad={handleMapLoad}
              onIdle={handleMapIdle}
              options={{
                disableDefaultUI: true,
                gestureHandling: 'greedy', // Critical for immediate mobile response
                clickableIcons: false,
                zoomControl: false,
              }}
            />
            
            {/* Center Pin Overlay */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
              <MapPin className="h-10 w-10 text-destructive drop-shadow-md" fill="currentColor" />
              <div className="w-1 h-1 bg-black/20 rounded-full mx-auto mt-[-4px] blur-[1px]" />
            </div>

            <Button
              onClick={handleLocateMe}
              className="absolute bottom-6 right-4 h-12 w-12 rounded-full shadow-xl bg-white text-black hover:bg-gray-100 z-20"
            >
              <Locate className={`h-6 w-6 ${isLocating ? 'animate-spin' : ''}`} />
            </Button>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">Loading Map...</div>
        )}
      </div>
      
      {/* Bottom Action Area */}
      <div className="bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-3 mb-4">
          <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm truncate">{locationName || 'Pinpointing...'}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{locationAddress}</p>
          </div>
        </div>
        <Button onClick={handleConfirm} className="w-full h-12 text-base font-bold rounded-xl">
          Confirm & proceed
        </Button>
      </div>
    </div>
  );
};

export default FullScreenLocationPicker;
