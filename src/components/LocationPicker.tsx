import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Crosshair } from 'lucide-react';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

const LocationPicker = ({ 
  open, 
  onOpenChange, 
  onLocationSelect, 
  initialLat, 
  initialLng 
}: LocationPickerProps) => {
  const [selectedLat, setSelectedLat] = useState(initialLat || 17.385044);
  const [selectedLng, setSelectedLng] = useState(initialLng || 78.486671);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const { isLoaded, loadError } = useGoogleMaps();

  // Try to pan to current location when picker opens (map renders immediately)
  useEffect(() => {
    if (!open) return;

    // Always initialize with provided coords if available
    if (initialLat != null && initialLng != null) {
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
    }

    if (!navigator.geolocation) return;

    setGettingLocation(true);

    // Short timeout - don't block UI
    const timeoutId = window.setTimeout(() => {
      setGettingLocation(false);
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeoutId);
        const { latitude, longitude, accuracy } = position.coords;
        // Skip if accuracy > 5km (likely IP-based)
        if (accuracy && accuracy > 5000) {
          console.warn('Location accuracy too low:', accuracy, 'm');
          setGettingLocation(false);
          return;
        }
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        setGettingLocation(false);

        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(16);
        }
      },
      (error) => {
        window.clearTimeout(timeoutId);
        console.error('Error getting current location:', error);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [open, initialLat, initialLng, map]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelectedLat(e.latLng.lat());
      setSelectedLng(e.latLng.lng());
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelectedLat(e.latLng.lat());
      setSelectedLng(e.latLng.lng());
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLat, selectedLng);
    onOpenChange(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    
    setGettingLocation(true);
    const timeoutId = window.setTimeout(() => setGettingLocation(false), 3000);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeoutId);
        const { latitude, longitude, accuracy } = position.coords;
        // Skip if accuracy > 5km (IP-based)
        if (accuracy && accuracy > 5000) {
          console.warn('Location accuracy too low:', accuracy, 'm');
          setGettingLocation(false);
          return;
        }
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        setGettingLocation(false);
        
        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(16);
        }
      },
      (error) => {
        window.clearTimeout(timeoutId);
        console.error('Error getting location:', error);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  if (!open) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-background flex flex-col touch-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onOpenChange(false)}
          className="p-0 h-auto"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">Select Seller Location</h2>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative" style={{ touchAction: 'none' }}>
        {loadError ? (
          <div className="h-full flex items-center justify-center bg-muted p-6">
            <div className="text-center max-w-sm">
              <p className="font-semibold text-foreground">Map not available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Google Maps failed to load. Please check your API key configuration.
              </p>
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
                clickableIcons: false,
                gestureHandling: 'greedy',
                draggable: true,
                scrollwheel: true,
                disableDoubleClickZoom: false,
              }}
            >
              <Marker
                position={{ lat: selectedLat, lng: selectedLng }}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(40, 40),
                }}
              />
            </GoogleMap>

            {/* Current Location Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              className="absolute top-4 right-4 gap-2 bg-background shadow-md"
            >
              <Crosshair className={`h-4 w-4 ${gettingLocation ? 'animate-pulse' : ''}`} />
              {gettingLocation ? 'Locating...' : 'Current Location'}
            </Button>
          </>
        )}
      </div>
      
      {/* Bottom Sheet */}
      <div className="bg-background border-t p-4 shadow-lg pointer-events-auto">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-full">
            <MapPin className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Selected Location</h3>
            <p className="text-sm text-muted-foreground">
              Coordinates: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
            </p>
          </div>
        </div>
        
        <Button 
          type="button"
          onClick={handleConfirm}
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white text-lg font-medium rounded-lg"
        >
          Confirm & proceed
        </Button>
      </div>
    </div>,
    document.body
  );
};

export default LocationPicker;
