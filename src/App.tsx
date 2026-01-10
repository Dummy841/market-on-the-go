import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Restaurants from "./pages/Restaurants";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/dashboard/Users";
import Sellers from "./pages/dashboard/Sellers";
import DeliveryPartners from "./pages/dashboard/DeliveryPartners";
import Orders from "./pages/dashboard/Orders";
import Refunds from "./pages/dashboard/Refunds";
import Settlements from "./pages/dashboard/Settlements";
import DashboardHome from "./pages/dashboard/DashboardHome";
import SellerSalesPage from "./pages/dashboard/SellerSalesPage";
import Banners from "./pages/dashboard/Banners";
import SellerLogin from "./pages/SellerLogin";
import SellerDashboard from "./pages/SellerDashboard";
import SellerWallet from "./pages/SellerWallet";
import DeliveryPartnerLogin from "./pages/DeliveryPartnerLogin";
import DeliveryPartnerDashboard from "./pages/DeliveryPartnerDashboard";
import RestaurantMenu from "./pages/RestaurantMenu";
import { Checkout } from "./pages/Checkout";
import { MyOrders } from "./pages/MyOrders";
import CartPage from "./pages/CartPage";
import UserWallet from "./pages/UserWallet";
import { SellerAuthProvider } from "./contexts/SellerAuthContext";
import { UserAuthProvider } from "./contexts/UserAuthContext";
import { CartProvider } from "./contexts/CartContext";
import { OrderTrackingProvider } from "./contexts/OrderTrackingContext";
import { GoogleMapsProvider } from "./contexts/GoogleMapsContext";
import { useAndroidBackButton } from "./hooks/useAndroidBackButton";
import { useLocationPermission } from "./hooks/useLocationPermission";

const queryClient = new QueryClient();

// Wrapper component to use the back button hook inside BrowserRouter
const AppContent = () => {
  useAndroidBackButton();
  useLocationPermission(); // Request location permission on app load
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/restaurants" element={<Restaurants />} />
      <Route path="/restaurant/:restaurantId" element={<RestaurantMenu />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/my-orders" element={<MyOrders />} />
      <Route path="/my-wallet" element={<UserWallet />} />
      <Route path="/seller-login" element={<SellerLogin />} />
      <Route path="/seller-dashboard" element={<SellerDashboard />} />
      <Route path="/seller-wallet" element={<SellerWallet />} />
      <Route path="/delivery-login" element={<DeliveryPartnerLogin />} />
      <Route path="/delivery-dashboard" element={<DeliveryPartnerDashboard />} />
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<DashboardHome />} />
        <Route path="users" element={<Users />} />
        <Route path="sellers" element={<Sellers />} />
        <Route path="sellers/:sellerId/sales" element={<SellerSalesPage />} />
        <Route path="orders" element={<Orders />} />
        <Route path="settlements" element={<Settlements />} />
        <Route path="refunds" element={<Refunds />} />
        <Route path="delivery-partners" element={<DeliveryPartners />} />
        <Route path="banners" element={<Banners />} />
      </Route>
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GoogleMapsProvider>
      <UserAuthProvider>
        <SellerAuthProvider>
          <CartProvider>
            <OrderTrackingProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </TooltipProvider>
            </OrderTrackingProvider>
          </CartProvider>
        </SellerAuthProvider>
      </UserAuthProvider>
    </GoogleMapsProvider>
  </QueryClientProvider>
);

export default App;