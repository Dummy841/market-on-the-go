
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Farmers from "./pages/Farmers";
import FarmerDashboard from "./pages/FarmerDashboard";
import FarmerDetails from "./pages/FarmerDetails";
import FarmerLogin from "./pages/FarmerLogin";
import FarmerTicketHistory from "./pages/FarmerTicketHistory";
import Customers from "./pages/Customers";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerRegister from "./pages/CustomerRegister";
import CustomerHome from "./pages/CustomerHome";
import CustomerProducts from "./pages/CustomerProducts";
import CustomerProfile from "./pages/CustomerProfile";
import CustomerOrderHistory from "./pages/CustomerOrderHistory";
import CustomerTicketHistory from "./pages/CustomerTicketHistory";
import CartPage from "./pages/CartPage";
import PaymentPage from "./pages/PaymentPage";
import OrderReceiptPage from "./pages/OrderReceiptPage";
import OrderTracking from "./pages/OrderTracking";
import OrderHistory from "./pages/OrderHistory";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Sales from "./pages/Sales";
import SalesDashboard from "./pages/SalesDashboard";
import Transactions from "./pages/Transactions";
import Tickets from "./pages/Tickets";
import Coupons from "./pages/Coupons";
import Employees from "./pages/Employees";
import Roles from "./pages/Roles";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeRegister from "./pages/EmployeeRegister";
import AccessDenied from "./pages/AccessDenied";
import AppLanding from "./pages/AppLanding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/app" element={<AppLanding />} />
            <Route path="/employee-login" element={<EmployeeLogin />} />
            <Route path="/employee-register" element={<EmployeeRegister />} />
            <Route path="/farmer-login" element={<FarmerLogin />} />
            <Route path="/customer-login" element={<CustomerLogin />} />
            <Route path="/customer-register" element={<CustomerRegister />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            
            {/* Protected Employee Routes */}
            <Route element={<ProtectedRoute resource="dashboard" action="view" />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="farmers" action="view" />}>
              <Route path="/farmers" element={<Farmers />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="customers" action="view" />}>
              <Route path="/customers" element={<Customers />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="products" action="view" />}>
              <Route path="/products" element={<Products />} />
            </Route>

            <Route element={<ProtectedRoute resource="categories" action="view" />}>
              <Route path="/categories" element={<Categories />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="sales" action="view" />}>
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales-dashboard" element={<SalesDashboard />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="transactions" action="view" />}>
              <Route path="/transactions" element={<Transactions />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="tickets" action="view" />}>
              <Route path="/tickets" element={<Tickets />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="coupons" action="view" />}>
              <Route path="/coupons" element={<Coupons />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="employees" action="view" />}>
              <Route path="/employees" element={<Employees />} />
            </Route>
            
            <Route element={<ProtectedRoute resource="roles" action="view" />}>
              <Route path="/roles" element={<Roles />} />
            </Route>
            
            {/* Farmer Routes */}
            <Route element={<ProtectedRoute resource="farmers" action="view" />}>
              <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
              <Route path="/farmer/:id" element={<FarmerDetails />} />
              <Route path="/farmer-tickets" element={<FarmerTicketHistory />} />
            </Route>
            
            {/* Customer Routes */}
            <Route element={<ProtectedRoute resource="customer" action="view" />}>
              <Route path="/customer-home" element={<CustomerHome />} />
              <Route path="/customer-products" element={<CustomerProducts />} />
              <Route path="/customer-profile" element={<CustomerProfile />} />
              <Route path="/customer-orders" element={<CustomerOrderHistory />} />
              <Route path="/customer-tickets" element={<CustomerTicketHistory />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/order-receipt" element={<OrderReceiptPage />} />
              <Route path="/order-tracking" element={<OrderTracking />} />
              <Route path="/order-history" element={<OrderHistory />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
