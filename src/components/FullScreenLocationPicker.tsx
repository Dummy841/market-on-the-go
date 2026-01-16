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
  const [selectedLat, setSelectedLat] = useState(initialLat ?? 17.385044);
  const [selectedLng, setSelectedLng] = useState(initialLng ?? 78.486671);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const { isLoaded, loadError } = useGoogleMaps();
  
  // Track if map has been initialized (to stop controlling center after first render)
  const [mapReady, setMapReady] = useState(false);
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number }>({ 
    lat: initialLat ?? 17.385044, 
    lng: initialLng ?? 78.486671 
  });
  
  // Set initial center when picker opens
  useEffect(() => {
    if (!open) {
      setMapReady(false);
      return;
    }

    // Determine starting position
    const storedLat = localStorage.getItem("currentLat");
    const storedLng = localStorage.getItem("currentLng");
    
    let startLat = 17.385044;
    let startLng = 78.486671;
    
    if (storedLat && storedLng) {
      startLat = parseFloat(storedLat);
      startLng = parseFloat(storedLng);
    } else if (initialLat != null && initialLng != null) {
      startLat = initialLat;
      startLng = initialLng;
    }
    
    setInitialCenter({ lat: startLat, lng: startLng });
    setSelectedLat(startLat);
    setSelectedLng(startLng);
    reverseGeocode(startLat, startLng);

    // Try to get fresh device location (don't block UI)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          if (accuracy && accuracy > 5000) {
            console.warn('Location accuracy too low:', accuracy, 'm');
            return;
          }
          setSelectedLat(latitude);
          setSelectedLng(longitude);
          reverseGeocode(latitude, longitude);
          if (mapRef.current) {
            mapRef.current.panTo({ lat: latitude, lng: longitude });
          }
        },
        (err) => {
          console.error('Error getting current location:', err);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      if (
        isLoaded &&
        typeof window !== "undefined" &&
        window.google?.maps?.Geocoder
      ) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });
        const first = result.results?.[0];

        if (first) {
          const comps = first.address_components || [];
          const pick = (types: string[]) =>
            comps.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

          const areaName =
            pick(["neighborhood", "sublocality", "sublocality_level_1"]) ||
            pick(["locality"]) ||
            "Selected Location";

          const state = pick(["administrative_area_level_1"]);
          const postal = pick(["postal_code"]);
          const country = pick(["country"]);

          setLocationName(areaName);
          setLocationAddress(
            [areaName, state, postal, country].filter(Boolean).join(", ")
          );
          return;
        }
      }

      // Fallback to Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "accept-language": "en" } }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address;

        const areaName =
          address?.hamlet ||
          address?.village ||
          address?.locality ||
          address?.neighbourhood ||
          address?.suburb ||
          address?.town ||
          address?.city ||
          "Selected Location";

        setLocationName(areaName);
        setLocationAddress(
          [areaName, address?.state, address?.postcode, address?.country]
            .filter(Boolean)
            .join(", ")
        );
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setLocationName("Selected Location");
      setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Mark map as ready so we stop controlling center prop
    setMapReady(true);
  }, []);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // When map stops moving, get center and reverse geocode
  const handleMapIdle = useCallback(() => {
    if (!mapRef.current) return;
    
    const center = mapRef.current.getCenter();
    if (center) {
      const lat = center.lat();
      const lng = center.lng();
      setSelectedLat(lat);
      setSelectedLng(lng);
      reverseGeocode(lat, lng);
    }
  }, [isLoaded]);

  const handleConfirm = () => {
    onLocationSelect(
      selectedLat,
      selectedLng,
      locationAddress || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
    );
    onClose();
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        reverseGeocode(latitude, longitude);
        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(17);
        }
        setIsLocating(false);
      },
      (err) => {
        console.error('Error getting location:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (!open) return null;

  // Only use controlled center before map is ready; after that let user drag freely
  const controlledCenter = mapReady ? undefined : initialCenter;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Header */}
      <div className="relative z-20 bg-background pt-[env(safe-area-inset-top)] px-3 pb-2 flex items-center gap-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Select Delivery Location</h1>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative" style={{ touchAction: 'none' }}>
        {loadError ? (
          <div className="h-full flex items-center justify-center bg-muted p-6">
            <div className="text-center max-w-sm">
              <p className="font-semibold text-foreground">Map not available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Google Maps is blocked by your API key settings.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => reverseGeocode(selectedLat, selectedLng)}
              >
                Refresh address
              </Button>
            </div>
          </div>
        ) : !isLoaded ? (
          <div className="h-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <>
            <GoogleMap
              mapContainerClassName="w-full h-full"
              mapContainerStyle={{ touchAction: 'auto' }}
              center={controlledCenter}
              zoom={17}
              onLoad={handleMapLoad}
              onUnmount={handleMapUnmount}
              onIdle={handleMapIdle}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                zoomControlOptions: {
                  position: google.maps.ControlPosition.RIGHT_CENTER
                },
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                gestureHandling: 'greedy',
                draggable: true,
                scrollwheel: true,
                disableDoubleClickZoom: false,
              }}
            />
            
            {/* Fixed Center Pin Overlay */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 pointer-events-none z-10"
              style={{ transform: 'translate(-50%, -100%)' }}
            >
              <div className="relative">
                <MapPin className="h-12 w-12 text-primary drop-shadow-lg" fill="hsl(var(--primary))" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1 bg-black/30 rounded-full" />
              </div>
            </div>
            
            {/* Locate Me Button */}
            <Button
              variant="secondary"
              size="icon"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-background border z-10"
            >
              <Locate className={`h-5 w-5 ${isLocating ? 'animate-pulse' : ''}`} />
            </Button>
          </>
        )}
      </div>
      
      {/* Bottom Sheet */}
      <div className="relative z-20 bg-background rounded-t-2xl shadow-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start gap-3 mb-3">
          <MapPin className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{locationName || 'Loading...'}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{locationAddress}</p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleConfirm}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl"
        >
          Confirm & proceed
        </Button>
      </div>
    </div>
  );
};

export default FullScreenLocationPicker;
