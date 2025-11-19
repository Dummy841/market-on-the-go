import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CurrentLocationButtonProps {
  onLocationFound: (lat: number, lng: number) => void;
  className?: string;
}

const CurrentLocationButton = ({ onLocationFound, className }: CurrentLocationButtonProps) => {
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Available",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Getting Location",
      description: "Please wait while we fetch your current location...",
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationFound(latitude, longitude);
        toast({
          title: "Location Found",
          description: "Your current location has been set successfully.",
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = "Unable to get your current location.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 300000 
      }
    );
  };

  return (
    <Button
      variant="outline"
      onClick={handleCurrentLocation}
      className={`bg-white shadow-lg border-2 rounded-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50 ${className}`}
    >
      <div className="p-1 bg-orange-100 rounded-full">
        <MapPin className="h-4 w-4 text-orange-600" />
      </div>
      <span className="text-sm font-medium">Use Current Location</span>
    </Button>
  );
};

export default CurrentLocationButton;