import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  
  const initialCenterRef = useRef<{ lat: number; lng: number }>({ 
    lat: initialLat ?? 17.385044, 
    lng: initialLng ?? 78.486671 
  });
  
  // Set initial center when picker opens
  // Set global flag for Android back button handler
  useEffect(() => {
    if (open) {
      (window as any).__locationPickerOpen = true;
      (window as any).__locationPickerClose = onClose;
    } else {
      (window as any).__locationPickerOpen = false;
      (window as any).__locationPickerClose = null;
    }
    return () => {
      (window as any).__locationPickerOpen = false;
      (window as any).__locationPickerClose = null;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
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
    
    initialCenterRef.current = { lat: startLat, lng: startLng };
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

  const mapReadyRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Set center via API call, not via React prop — avoids re-render fighting with touch
    map.setCenter(initialCenterRef.current);
    map.setZoom(17);
    // Small delay before enabling idle processing to let map fully initialize
    setTimeout(() => {
      mapReadyRef.current = true;
    }, 500);
  }, []);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
    mapReadyRef.current = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  // Debounced idle handler — prevents rapid state updates during touch interaction
  const handleMapIdle = useCallback(() => {
    if (!mapRef.current || !mapReadyRef.current) return;
    
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      const center = mapRef.current.getCenter();
      if (center) {
        const lat = center.lat();
        const lng = center.lng();
        setSelectedLat(lat);
        setSelectedLng(lng);
        reverseGeocode(lat, lng);
      }
    }, 300);
  }, [isLoaded]);

  const handleConfirm = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLocationSelect(
      selectedLat,
      selectedLng,
      locationAddress || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
    );
    onClose();
  }, [selectedLat, selectedLng, locationAddress, onLocationSelect, onClose]);

  const handleBack = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const handleLocateMe = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
  }, []);

  // Memoize map options to prevent re-renders
  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    zoomControlOptions: {
      position: typeof google !== 'undefined' ? google.maps.ControlPosition.RIGHT_CENTER : undefined
    },
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy' as const,
    draggable: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    keyboardShortcuts: true,
  }), []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Header */}
      <div 
        className="relative z-30 bg-background pt-[env(safe-area-inset-top)] px-3 pb-2 flex items-center gap-3 border-b"
        style={{ touchAction: 'manipulation' }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleBack}
          onTouchEnd={handleBack}
          className="h-10 w-10 rounded-full shrink-0 pointer-events-auto"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Select Delivery Location</h1>
      </div>
      
      {/* Map Container - no touch-action restrictions, let Google Maps own all gestures */}
      <div 
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {loadError ? (
          <div className="h-full flex items-center justify-center bg-muted p-6">
            <div className="text-center max-w-sm">
              <p className="font-semibold text-foreground">Map not available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Google Maps is blocked by your API key settings.
              </p>
              <Button
                type="button"
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
              mapContainerClassName="w-full h-full absolute inset-0"
              mapContainerStyle={{ 
                width: '100%',
                height: '100%',
                touchAction: 'none',
              }}
              zoom={17}
              onLoad={handleMapLoad}
              onUnmount={handleMapUnmount}
              onIdle={handleMapIdle}
              options={mapOptions}
            />
            
            {/* Fixed Center Pin Overlay - Default Google red color */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 pointer-events-none z-10"
              style={{ transform: 'translate(-50%, -100%)' }}
            >
              <div className="relative">
                <MapPin className="h-12 w-12 drop-shadow-lg" style={{ color: '#EA4335' }} fill="#EA4335" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1 bg-black/30 rounded-full" />
              </div>
            </div>
            
            {/* Locate Me Button */}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleLocateMe}
              onTouchEnd={handleLocateMe}
              disabled={isLocating}
              className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-background border z-20 pointer-events-auto"
              style={{ touchAction: 'manipulation' }}
            >
              <Locate className={`h-5 w-5 ${isLocating ? 'animate-pulse' : ''}`} />
            </Button>
          </>
        )}
      </div>
      
      {/* Bottom Sheet - Ensure it's clickable */}
      <div 
        className="relative z-30 bg-background rounded-t-2xl shadow-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        style={{ touchAction: 'manipulation' }}
      >
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
          onTouchEnd={handleConfirm}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl pointer-events-auto"
          style={{ touchAction: 'manipulation' }}
        >
          Confirm & proceed
        </Button>
      </div>
    </div>
  );
};

export default FullScreenLocationPicker;
