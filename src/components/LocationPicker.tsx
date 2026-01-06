import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';
import CurrentLocationButton from '@/components/CurrentLocationButton';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

const containerStyle = {
  width: '100%',
  height: '384px'
};

const LocationPicker = ({ 
  open, 
  onOpenChange, 
  onLocationSelect, 
  initialLat = 28.6139, 
  initialLng = 77.2090 
}: LocationPickerProps) => {
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();

  // Get current location when dialog opens
  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedLat(latitude);
          setSelectedLng(longitude);
        },
        (error) => {
          console.error('Error getting current location:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, [open]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
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

  const handleCurrentLocationClick = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    
    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(16);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DialogTitle className="text-lg font-semibold">Select Location</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative">
          {loadError ? (
            <div className="h-96 flex items-center justify-center bg-muted p-6">
              <div className="text-center max-w-sm">
                <p className="font-semibold text-foreground">Map not available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Google Maps is blocked by your API key settings (billing). Enable billing for the
                  Google project linked to this key, then reload.
                </p>
              </div>
            </div>
          ) : !isLoaded ? (
            <div className="h-96 flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : null}
          
          {isLoaded && !loadError && (
            <>
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={{ lat: selectedLat, lng: selectedLng }}
                zoom={15}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={handleMapClick}
                options={{
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  clickableIcons: false,
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
              <CurrentLocationButton
                onLocationFound={handleCurrentLocationClick}
                className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
              />
              
              {/* Bottom Sheet with Address */}
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 shadow-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Order will be delivered here</p>
                    <h3 className="font-semibold text-lg">Selected Location</h3>
                    <p className="text-sm text-muted-foreground">
                      Coordinates: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleConfirm}
                  className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white text-lg font-medium rounded-lg"
                >
                  Confirm & proceed
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPicker;
