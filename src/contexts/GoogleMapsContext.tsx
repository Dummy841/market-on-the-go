import React, { createContext, useContext, useEffect, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

// Inner component that actually loads Google Maps
const GoogleMapsLoader = ({ children, apiKey }: { children: React.ReactNode; apiKey: string }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const GoogleMapsProvider = ({ children }: GoogleMapsProviderProps) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyFetched, setKeyFetched] = useState(false);

  // Fetch Google Maps API key once on mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (data?.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error);
      } finally {
        setKeyFetched(true);
      }
    };
    fetchApiKey();
  }, []);

  // Show nothing until we've attempted to fetch the key
  if (!keyFetched) {
    return <>{children}</>;
  }

  // If we have an API key, use the loader component
  if (apiKey) {
    return (
      <GoogleMapsLoader apiKey={apiKey}>
        {children}
      </GoogleMapsLoader>
    );
  }

  // No API key available, provide default context
  return (
    <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: undefined }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};
