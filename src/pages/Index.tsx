import { Header } from "@/components/Header";
import { HomeBanner } from "@/components/HomeBanner";
import { HomeSearchBar } from "@/components/HomeSearchBar";
import { HomeProductsGrid } from "@/components/HomeProductsGrid";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import OrderTrackingButton from "@/components/OrderTrackingButton";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import NotificationPermissionBanner from "@/components/NotificationPermissionBanner";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const Index = () => {
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated } = useUserAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  useEffect(() => {
    getUserLocation();
    
    // Listen for address changes from the Header
    const handleAddressChanged = (event: CustomEvent) => {
      const { latitude, longitude } = event.detail;
      if (latitude && longitude) {
        setUserLocation({
          lat: parseFloat(latitude.toString()),
          lng: parseFloat(longitude.toString())
        });
      }
    };
    
    window.addEventListener('addressChanged', handleAddressChanged as EventListener);
    return () => {
      window.removeEventListener('addressChanged', handleAddressChanged as EventListener);
    };
  }, []);

  // Request microphone permission after login
  useEffect(() => {
    if (isAuthenticated && user) {
      requestMicrophonePermission();
    }
  }, [isAuthenticated, user]);

  const requestMicrophonePermission = async () => {
    try {
      // Check if permission was already requested
      const permissionRequested = localStorage.getItem('mic_permission_requested');
      if (permissionRequested) return;

      // Check if browser supports permissions API
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (result.state === 'granted' || result.state === 'denied') {
          localStorage.setItem('mic_permission_requested', 'true');
          return;
        }
      }

      // Request permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      localStorage.setItem('mic_permission_requested', 'true');
      toast({
        title: "Voice search enabled",
        description: "You can now use voice search to find products",
      });
    } catch (error) {
      // User denied or error occurred - mark as requested to not ask again
      localStorage.setItem('mic_permission_requested', 'true');
      console.log('Microphone permission not granted');
    }
  };

  const getUserLocation = async () => {
    try {
      // First, check if there's a selected address in localStorage
      const storedAddress = localStorage.getItem('selectedAddress');
      if (storedAddress) {
        try {
          const parsed = JSON.parse(storedAddress);
          if (parsed?.latitude != null && parsed?.longitude != null) {
            setUserLocation({
              lat: parseFloat(parsed.latitude.toString()),
              lng: parseFloat(parsed.longitude.toString()),
            });
            return;
          }
        } catch (error) {
          console.error('Error parsing stored address:', error);
        }
      }

      // Next, fall back to the latest device/current coordinates saved by Header
      const currentLat = localStorage.getItem('currentLat');
      const currentLng = localStorage.getItem('currentLng');
      if (currentLat && currentLng) {
        setUserLocation({
          lat: parseFloat(currentLat),
          lng: parseFloat(currentLng),
        });
        return;
      }

      // If no saved address, use browser geolocation with timeout
      if (navigator.geolocation) {
        const timeoutId = setTimeout(() => {
          // Fallback if geolocation takes too long
          setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Hyderabad default
        }, 5000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          () => {
            clearTimeout(timeoutId);
            // Default to a location if geolocation fails
            setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Hyderabad
          },
          { timeout: 5000 }
        );
      } else {
        setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Default
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      setUserLocation({ lat: 17.385044, lng: 78.486671 }); // Default
    }
  };
  
  return (
    <div className="min-h-screen bg-background pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <NotificationPermissionBanner />
      <Header />
      <main>
        {/* Banner hidden per request */}
        {/* <HomeBanner /> */}
        
        {/* Sticky search bar */}
        <HomeSearchBar onSearch={handleSearch} />
        
        {/* Products grid - 2 column layout */}
        <HomeProductsGrid userLocation={userLocation} searchQuery={searchQuery} />
      </main>
      <Footer />
      <BottomNav />
      
      {/* Floating View Cart Button */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 p-4 pointer-events-none">
          <Button
            onClick={() => navigate('/cart')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 shadow-lg flex items-center justify-between pointer-events-auto rounded-full"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-1 rounded text-sm">
                {getTotalItems()}
              </span>
              <span>Item{getTotalItems() > 1 ? 's' : ''} added</span>
            </div>
            <div className="flex items-center gap-2">
              <span>View Cart</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Button>
        </div>
      )}
      
      <OrderTrackingButton onClick={() => setShowTrackingModal(true)} />
      <OrderTrackingModal isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} />
    </div>
  );
};

export default Index;
