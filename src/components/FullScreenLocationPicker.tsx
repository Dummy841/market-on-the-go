import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, Search, Crosshair } from 'lucide-react';
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
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const { isLoaded, loadError } = useGoogleMaps();
  
  // When the picker opens, get current location immediately
  useEffect(() => {
    if (!open) return;

    setSearchQuery("");
    setIsLocating(true);

    // Start with stored location or initial coords immediately (no waiting)
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
    
    setSelectedLat(startLat);
    setSelectedLng(startLng);
    reverseGeocode(startLat, startLng);

    // Now try to get fresh device location (don't block UI)
    if (navigator.geolocation) {
      const timeoutId = window.setTimeout(() => {
        setIsLocating(false);
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(timeoutId);
          const { latitude, longitude, accuracy } = pos.coords;
          // Only use location if accuracy is reasonable (< 5km)
          if (accuracy && accuracy > 5000) {
            console.warn('Location accuracy too low:', accuracy, 'm');
            setIsLocating(false);
            return;
          }
          setSelectedLat(latitude);
          setSelectedLng(longitude);
          reverseGeocode(latitude, longitude);
          if (map) {
            map.panTo({ lat: latitude, lng: longitude });
            map.setZoom(17);
          }
          setIsLocating(false);
        },
        (err) => {
          window.clearTimeout(timeoutId);
          console.error('Error getting current location:', err);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setIsLocating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Prefer in-browser Google Maps Geocoder when Maps is loaded (most accurate)
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

      // Fallback to Nominatim for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "accept-language": "en" } }
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.address;

        // Priority order: hamlet > village > locality > neighbourhood > suburb > town > city
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

        const fullAddress = [
          areaName,
          address?.state,
          address?.postcode,
          address?.country,
        ]
          .filter(Boolean)
          .join(", ");

        setLocationAddress(fullAddress);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setLocationName("Selected Location");
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
    onLocationSelect(
      selectedLat,
      selectedLng,
      locationAddress || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
    );
    onClose();
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    
    const timeoutId = window.setTimeout(() => setIsLocating(false), 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeoutId);
        const { latitude, longitude, accuracy } = position.coords;
        // Reject if accuracy is worse than 5km (IP-based location)
        if (accuracy && accuracy > 5000) {
          console.warn('Location accuracy too low:', accuracy, 'm');
          setIsLocating(false);
          return;
        }
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        reverseGeocode(latitude, longitude);

        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(17);
        }
        setIsLocating(false);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        console.error('Error getting current location:', error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col touch-auto">
      {/* Header with Search */}
      <div className="relative z-20 bg-background p-4 flex items-center gap-3 border-b">
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
        {loadError ? (
          <div className="h-full flex items-center justify-center bg-muted p-6">
            <div className="text-center max-w-sm">
              <p className="font-semibold text-foreground">Map not available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Google Maps is blocked by your API key settings. Console shows a billing error.
                Enable billing for the Google project linked to this key, then reload.
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
              mapContainerClassName="w-full h-full touch-auto"
              center={{ lat: selectedLat, lng: selectedLng }}
              zoom={16}
              onLoad={(m) => {
                onLoad(m);
                // Ensure the map becomes interactive immediately on mobile
                m.setOptions({ gestureHandling: 'greedy' });
              }}
              onUnmount={onUnmount}
              onClick={handleMapClick}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                gestureHandling: 'greedy',
                draggable: true,
              }}
            >
              <Marker
                position={{ lat: selectedLat, lng: selectedLng }}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  scaledSize: new google.maps.Size(50, 50),
                }}
              />
            </GoogleMap>

            {/* Current Location Button */}
            <Button
              onClick={handleCurrentLocation}
              disabled={isLocating}
              variant="outline"
              className="absolute bottom-44 left-1/2 -translate-x-1/2 z-20 bg-background shadow-lg rounded-full px-4 h-10"
            >
              <Crosshair className={`h-4 w-4 mr-2 text-primary ${isLocating ? 'animate-pulse' : ''}`} />
              <span>Current location</span>
            </Button>
          </>
        )}
      </div>
      
      {/* Bottom Sheet */}
      <div className="relative z-20 bg-background rounded-t-3xl shadow-2xl p-5 pb-8 pointer-events-auto">
        <p className="text-sm text-muted-foreground mb-1">Place the pin at exact delivery location</p>
        <p className="text-xs text-muted-foreground mb-3">Order will be delivered here</p>

        <div className="flex items-start gap-3 mb-5">
          <MapPin className="h-6 w-6 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{locationName || 'Loading...'}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{locationAddress}</p>
          </div>
        </div>

        <Button
          type="button"
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
