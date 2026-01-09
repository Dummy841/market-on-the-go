import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, Search } from 'lucide-react';
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
  const [searchResults, setSearchResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
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

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    // Initialize places service for search
    if (window.google?.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      placesServiceRef.current = new google.maps.places.PlacesService(mapInstance);
    }
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

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (!value.trim() || !autocompleteServiceRef.current) {
      setSearchResults([]);
      return;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      { 
        input: value,
        componentRestrictions: { country: 'in' }
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSearchResults(predictions);
        } else {
          setSearchResults([]);
        }
      }
    );
  };

  // Handle place selection from search
  const handlePlaceSelect = (placeId: string) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      { placeId, fields: ['geometry', 'formatted_address', 'name'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          setSelectedLat(lat);
          setSelectedLng(lng);
          setSearchQuery('');
          setSearchResults([]);
          reverseGeocode(lat, lng);

          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(17);
          }
        }
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col touch-auto">
      {/* Header with Search */}
      <div className="relative z-20 bg-background p-3 flex items-center gap-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search an area or address"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-11 rounded-full bg-muted/50"
          />
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto z-30">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handlePlaceSelect(result.place_id)}
                  className="w-full text-left px-4 py-3 hover:bg-muted border-b last:border-b-0 flex items-start gap-3"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{result.structured_formatting.main_text}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.structured_formatting.secondary_text}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Map Container - 75% height */}
      <div className="h-[60vh] relative">
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
          </>
        )}
      </div>
      
      {/* Bottom Sheet - remaining 25% */}
      <div className="flex-1 relative z-20 bg-background rounded-t-3xl shadow-2xl p-4 pointer-events-auto flex flex-col">
        <p className="text-sm text-muted-foreground">Place the pin at exact delivery location</p>
        <p className="text-xs text-muted-foreground mb-2">Order will be delivered here</p>

        <div className="flex items-start gap-3 mb-4">
          <MapPin className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{locationName || 'Loading...'}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{locationAddress}</p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleConfirm}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl mt-auto"
        >
          Confirm & proceed
        </Button>
      </div>
    </div>
  );
};

export default FullScreenLocationPicker;
