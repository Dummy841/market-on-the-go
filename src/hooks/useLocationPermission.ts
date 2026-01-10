import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/hooks/use-toast';

export const useLocationPermission = () => {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (!('geolocation' in navigator)) {
      setPermissionGranted(false);
      return;
    }

    try {
      // Check current permission state
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        setPermissionGranted(true);
        return;
      }
      
      if (permission.state === 'denied') {
        setPermissionGranted(false);
        // Show toast on native platforms to guide users
        if (Capacitor.isNativePlatform()) {
          toast({
            title: "Location Access Required",
            description: "Please enable location access in your device settings to see nearby restaurants.",
            variant: "destructive"
          });
        }
        return;
      }

      // If prompt state, actively request location to trigger permission dialog
      if (permission.state === 'prompt') {
        navigator.geolocation.getCurrentPosition(
          () => {
            setPermissionGranted(true);
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              setPermissionGranted(false);
              toast({
                title: "Location Access Denied",
                description: "Enable location access to see restaurants near you.",
                variant: "destructive"
              });
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      }

      // Listen for permission changes
      permission.onchange = () => {
        setPermissionGranted(permission.state === 'granted');
      };
    } catch (error) {
      console.error('Error checking location permission:', error);
      // Fallback: try to get location directly
      navigator.geolocation.getCurrentPosition(
        () => setPermissionGranted(true),
        () => setPermissionGranted(false),
        { timeout: 10000 }
      );
    }
  };

  return { permissionGranted, requestLocationPermission };
};
