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
  const [locationReady, setLocationReady] = useState(false);
  const { isLoaded, loadError } = useGoogleMaps();

  // Get current location immediately when dialog opens
  useEffect(() => {
    if (open) {
      setLocationReady(false);
      
      // If we have valid initial coordinates, use them
      if (initialLat && initialLng && initialLat !== 28.6139) {
        setSelectedLat(initialLat);
        setSelectedLng(initialLng);
        setLocationReady(true);
        return;
      }

      // Otherwise get current location immediately
      setGettingLocation(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setSelectedLat(latitude);
            setSelectedLng(longitude);
            setGettingLocation(false);
            setLocationReady(true);
            
            // Pan map to location
            if (map) {
              map.panTo({ lat: latitude, lng: longitude });
              map.setZoom(16);
            }
          },
          (error) => {
            console.error('Error getting current location:', error);
            setGettingLocation(false);
            setLocationReady(true);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setGettingLocation(false);
        setLocationReady(true);
      }
    }
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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        setGettingLocation(false);
        
        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(16);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (!open) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-background flex flex-col"
      style={{ touchAction: 'auto' }}
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
      <div className="flex-1 relative">
        {loadError ? (
          <div className="h-full flex items-center justify-center bg-muted p-6">
            <div className="text-center max-w-sm">
              <p className="font-semibold text-foreground">Map not available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Google Maps failed to load. Please check your API key configuration.
              </p>
            </div>
          </div>
        ) : !isLoaded || !locationReady ? (
          <div className="h-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {gettingLocation ? 'Getting your current location...' : 'Loading map...'}
              </p>
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
                clickableIcons: false,
                gestureHandling: 'greedy',
              }}
            >
              <Marker
                position={{ lat: selectedLat, lng: selectedLng }}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                }}
              />
            </GoogleMap>
            
            {/* Current Location Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              className="absolute top-4 right-4 gap-2 bg-white shadow-md hover:bg-gray-50"
            >
              <Crosshair className={`h-4 w-4 ${gettingLocation ? 'animate-pulse' : ''}`} />
              {gettingLocation ? 'Locating...' : 'Current Location'}
            </Button>
          </>
        )}
      </div>
      
      {/* Bottom Sheet */}
      <div className="bg-background border-t p-4 shadow-lg">
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
          onClick={handleConfirm}
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white text-lg font-medium rounded-lg"
          disabled={!locationReady}
        >
          Confirm & proceed
        </Button>
      </div>
    </div>,
    document.body
  );
};

export default LocationPicker;
