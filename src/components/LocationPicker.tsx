import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';
import CurrentLocationButton from '@/components/CurrentLocationButton';

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
  initialLat = 28.6139, 
  initialLng = 77.2090 
}: LocationPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [mapboxToken, setMapboxToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Get current location when dialog opens and when "Use Current Location" is clicked
  useEffect(() => {
    if (open && navigator.geolocation) {
      // Auto-get current location when dialog opens
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedLat(latitude);
          setSelectedLng(longitude);
        },
        (error) => {
          console.error('Error getting current location:', error);
          // Fallback to default location (Delhi) if geolocation fails
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, [open]);
  
  // Fetch Mapbox token when dialog opens
  useEffect(() => {
    if (open && !mapboxToken) {
      const fetchToken = async () => {
        setLoading(true);
        try {
          const response = await fetch('https://zgyxybgogjzeuocuoane.supabase.co/functions/v1/get-mapbox-token');
          const data = await response.json();
          if (data.token) {
            setMapboxToken(data.token);
          }
        } catch (error) {
          console.error('Failed to fetch Mapbox token:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchToken();
    }
  }, [open, mapboxToken]);
  
  useEffect(() => {
    if (!open || !mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [selectedLng, selectedLat],
      zoom: 15, // Higher zoom for better location detail
    });

    // Add marker with red color like Google Maps
    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: '#EA4335' // Google Maps red color
    })
      .setLngLat([selectedLng, selectedLat])
      .addTo(map.current);

    // Update coordinates when marker is dragged
    marker.current.on('dragend', () => {
      const lngLat = marker.current!.getLngLat();
      setSelectedLat(lngLat.lat);
      setSelectedLng(lngLat.lng);
    });

    // Add click event to map
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setSelectedLat(lat);
      setSelectedLng(lng);
      marker.current!.setLngLat([lng, lat]);
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [open, mapboxToken]);

  // Update map center and marker when coordinates change
  useEffect(() => {
    if (map.current && marker.current) {
      map.current.setCenter([selectedLng, selectedLat]);
      marker.current.setLngLat([selectedLng, selectedLat]);
    }
  }, [selectedLat, selectedLng]);

  const handleConfirm = () => {
    onLocationSelect(selectedLat, selectedLng);
    onOpenChange(false);
  };

  const handleCurrentLocationClick = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    
    // Update map and marker if they exist
    if (map.current && marker.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        essential: true
      });
      marker.current.setLngLat([lng, lat]);
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
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
          
          {!loading && !mapboxToken && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">Failed to load map. Please try again.</p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
              </div>
            </div>
          )}
          
          {!loading && mapboxToken && (
            <>
              <div ref={mapContainer} className="w-full h-96" />
              
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