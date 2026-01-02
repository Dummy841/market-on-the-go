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
import Banners from "./pages/dashboard/Banners";
import SellerLogin from "./pages/SellerLogin";
import SellerDashboard from "./pages/SellerDashboard";
import DeliveryPartnerLogin from "./pages/DeliveryPartnerLogin";
import DeliveryPartnerDashboard from "./pages/DeliveryPartnerDashboard";
import RestaurantMenu from "./pages/RestaurantMenu";
import { Checkout } from "./pages/Checkout";
import { MyOrders } from "./pages/MyOrders";
import CartPage from "./pages/CartPage";
import { SellerAuthProvider } from "./contexts/SellerAuthContext";
import { UserAuthProvider } from "./contexts/UserAuthContext";
import { CartProvider } from "./contexts/CartContext";
import { OrderTrackingProvider } from "./contexts/OrderTrackingContext";
import { GoogleMapsProvider } from "./contexts/GoogleMapsContext";

const queryClient = new QueryClient();

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
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/restaurants" element={<Restaurants />} />
                    <Route path="/restaurant/:restaurantId" element={<RestaurantMenu />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/my-orders" element={<MyOrders />} />
                    <Route path="/seller-login" element={<SellerLogin />} />
                    <Route path="/seller-dashboard" element={<SellerDashboard />} />
                    <Route path="/delivery-login" element={<DeliveryPartnerLogin />} />
                    <Route path="/delivery-dashboard" element={<DeliveryPartnerDashboard />} />
                    <Route path="/dashboard" element={<Dashboard />}>
                      <Route path="users" element={<Users />} />
                      <Route path="sellers" element={<Sellers />} />
                      <Route path="orders" element={<Orders />} />
                      <Route path="delivery-partners" element={<DeliveryPartners />} />
                      <Route path="banners" element={<Banners />} />
                    </Route>
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
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
