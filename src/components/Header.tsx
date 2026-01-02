import { useState, useEffect, useRef } from "react";
import { MapPin, User, LogOut, CreditCard, Heart, FileText, Settings, ChevronDown, AlertCircle, Menu, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { SearchResults } from "@/components/SearchResults";
import AddressSelector from "@/components/AddressSelector";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useCart } from "@/contexts/CartContext";
import { useZippyPass } from "@/hooks/useZippyPass";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("Detecting...");
  const [locationGranted, setLocationGranted] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    label: string;
    address: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const {
    user,
    login,
    logout,
    isAuthenticated
  } = useUserAuth();
  const {
    getTotalItems
  } = useCart();
  const { hasActivePass, getDaysRemaining } = useZippyPass();
  const navigateToPage = useNavigate();

  useEffect(() => {
    requestLocationPermission();
    if (isAuthenticated) {
      loadSelectedAddress();
    }
  }, [isAuthenticated]);
  
  const loadSelectedAddress = async () => {
    if (!user) return;
    
    // First check localStorage for selected address
    const storedAddress = localStorage.getItem('selectedAddress');
    if (storedAddress) {
      try {
        setSelectedAddress(JSON.parse(storedAddress));
        return;
      } catch (error) {
        console.error('Error parsing stored address:', error);
      }
    }
    
    // Fallback to loading from database
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('label, full_address')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const addressData = {
          label: data.label,
          address: data.full_address
        };
        setSelectedAddress(addressData);
        localStorage.setItem('selectedAddress', JSON.stringify(addressData));
      }
    } catch (error) {
      console.error('No saved addresses found');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const requestLocationPermission = async () => {
    if ('geolocation' in navigator) {
      try {
        const permission = await navigator.permissions.query({
          name: 'geolocation'
        });
        if (permission.state === 'granted') {
          getCurrentLocation();
        } else if (permission.state === 'prompt') {
          navigator.geolocation.getCurrentPosition(position => {
            setLocationGranted(true);
            reverseGeocode(position.coords.latitude, position.coords.longitude);
          }, error => {
            console.error('Location access denied:', error);
            setCurrentLocation("Enable location");
            toast({
              title: "Location Access",
              description: "Please enable location access to see nearby restaurants",
              variant: "destructive"
            });
          });
        } else {
          setCurrentLocation("Enable location");
        }
      } catch (error) {
        console.error('Error requesting location:', error);
        setCurrentLocation("Select Location");
      }
    } else {
      setCurrentLocation("Select Location");
    }
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(position => {
      setLocationGranted(true);
      reverseGeocode(position.coords.latitude, position.coords.longitude);
    }, error => {
      console.error('Error getting location:', error);
      setCurrentLocation("Select Location");
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setCurrentLocation("Detecting...");
      
      // Use Nominatim API with max zoom for village-level precision
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.address;
        // Get the first part of display_name which is usually the most specific location
        const displayParts = data.display_name?.split(',');
        const firstPart = displayParts?.[0]?.trim();
        
        // Prioritize village/hamlet/locality, then county (mandal), then city
        const areaName = address?.village || 
                         address?.hamlet || 
                         address?.locality ||
                         address?.neighbourhood ||
                         address?.suburb || 
                         address?.town ||
                         address?.county ||
                         firstPart ||
                         address?.city ||
                         address?.state_district ||
                         "Select Location";
        setCurrentLocation(areaName);
        localStorage.setItem('currentLocationName', areaName);
      } else {
        setCurrentLocation("Select Location");
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setCurrentLocation("Select Location");
    }
  };

  const handleAuthSuccess = (userData: any) => {
    login(userData);
  };

  const handleRegisterRequired = () => {
    setShowRegister(true);
  };

  const handleLogout = () => {
    logout();
  };

  return <header className="sticky top-0 z-[100] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          

          {/* Location */}
          <button 
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
            onClick={() => isAuthenticated ? setShowAddressSelector(true) : requestLocationPermission()}
          >
            <MapPin className="h-5 w-5 text-orange-500" />
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {isAuthenticated && selectedAddress ? selectedAddress.label : currentLocation}
                </span>
                {isAuthenticated && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
              </div>
              {isAuthenticated && selectedAddress && (
                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                  {selectedAddress.address}
                </span>
              )}
            </div>
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-4" ref={searchRef}>
            
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            {isAuthenticated ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 h-10 px-3">
                    <div className={`relative ${hasActivePass ? 'p-0.5 rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500' : ''}`}>
                      <Avatar className={`h-8 w-8 ${hasActivePass ? 'border-2 border-background' : ''}`}>
                        <AvatarImage src="" alt={user?.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {hasActivePass && (
                        <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-0.5">
                          <Crown className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium">{user?.name}</span>
                      <span className="text-xs text-muted-foreground">{user?.mobile}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
                  <DropdownMenuLabel className="pb-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{user?.name}</span>
                        {hasActivePass && (
                          <Badge className="bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs px-1.5 py-0">
                            <Crown className="h-3 w-3 mr-1" />
                            Zippy
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{user?.mobile}</span>
                      {hasActivePass && (
                        <span className="text-xs text-orange-500">{getDaysRemaining()} days remaining</span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center space-x-2 py-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Payment Modes</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-2 py-2">
                    <Heart className="h-4 w-4" />
                    <span>Favourites</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-2 py-2" onClick={() => navigateToPage('/my-orders')}>
                    <FileText className="h-4 w-4" />
                    <span>My Orders</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-2 py-2">
                    <Settings className="h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center space-x-2 py-2 text-destructive focus:text-destructive" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> : <>
                <Button variant="ghost" size="sm" onClick={() => setShowRegister(true)} className="hidden md:flex">
                  Register
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowLogin(true)} className="hidden md:flex">
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </>}
            
            {/* Mobile Menu */}
            {!isAuthenticated && <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-4 mt-6">
                    <Button variant="default" className="w-full justify-start" onClick={() => {
                  setShowMobileMenu(false);
                  setShowRegister(true);
                }}>
                      Register
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => {
                  setShowMobileMenu(false);
                  setShowLogin(true);
                }}>
                      <User className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>}
          </div>
        </div>
      </div>

      <RegisterForm isOpen={showRegister} onClose={() => setShowRegister(false)} onSuccess={handleAuthSuccess} />
      
      <LoginForm isOpen={showLogin} onClose={() => setShowLogin(false)} onSuccess={handleAuthSuccess} onRegisterRequired={handleRegisterRequired} />
      
      {isAuthenticated && (
        <AddressSelector
          open={showAddressSelector}
          onOpenChange={setShowAddressSelector}
          onAddressSelect={(address) => {
            const addressData = {
              label: address.label,
              address: address.address,
              latitude: address.latitude,
              longitude: address.longitude
            };
            setSelectedAddress(addressData);
            // Note: localStorage and event dispatch are handled by AddressSelector
            setShowAddressSelector(false);
          }}
          selectedAddress={selectedAddress ? {
            id: '',
            label: selectedAddress.label,
            address: selectedAddress.address
          } : undefined}
        />
      )}
    </header>;
};
