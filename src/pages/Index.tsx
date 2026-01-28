import { Header } from "@/components/Header";
import { UniversalSearchBar } from "@/components/UniversalSearchBar";
import { ServiceCategories } from "@/components/ServiceCategories";
import { HomeCategorySellers } from "@/components/HomeCategorySellers";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import OrderTrackingButton from "@/components/OrderTrackingButton";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import NotificationPermissionBanner from "@/components/NotificationPermissionBanner";
import { HomeBanner } from "@/components/HomeBanner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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
        <HomeBanner />
        <ServiceCategories onFoodDeliveryClick={() => navigate('/restaurants')} />
        
        {/* Instamart Section */}
        <HomeCategorySellers 
          title="Instamart - Quick Delivery" 
          category="instamart" 
          userLocation={userLocation}
        />
        
        {/* Dairy Products Section */}
        <HomeCategorySellers 
          title="Dairy Products - Fresh Daily" 
          category="dairy" 
          userLocation={userLocation}
        />
      </main>
      <Footer />
      <BottomNav />
      <OrderTrackingButton onClick={() => setShowTrackingModal(true)} />
      <OrderTrackingModal isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} />
    </div>
  );
};

export default Index;