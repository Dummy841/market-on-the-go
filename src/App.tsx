
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';

// Import all page components
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import AppLanding from './pages/AppLanding';
import FarmerLogin from './pages/FarmerLogin';
import EmployeeLogin from './pages/EmployeeLogin';
import EmployeeRegister from './pages/EmployeeRegister';
import CustomerLogin from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import CustomerHome from './pages/CustomerHome';
import CustomerProducts from './pages/CustomerProducts';
import CustomerOrderHistory from './pages/CustomerOrderHistory';
import CustomerProfile from './pages/CustomerProfile';
import CartPage from './pages/CartPage';
import PaymentPage from './pages/PaymentPage';
import OrderTracking from './pages/OrderTracking';
import OrderHistory from './pages/OrderHistory';
import OrderReceiptPage from './pages/OrderReceiptPage';
import CustomerTicketHistory from './pages/CustomerTicketHistory';
import FarmerDashboard from './pages/FarmerDashboard';
import FarmerDetails from './pages/FarmerDetails';
import FarmerTicketHistory from './pages/FarmerTicketHistory';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import Products from './pages/Products';
import Sales from './pages/Sales';
import SalesDashboard from './pages/SalesDashboard';
import Transactions from './pages/Transactions';
import Coupons from './pages/Coupons';
import Employees from './pages/Employees';
import Roles from './pages/Roles';
import Tickets from './pages/Tickets';
import Customers from './pages/Customers';
import AccessDenied from './pages/AccessDenied';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/app" element={<AppLanding />} />
            <Route path="/farmer-login" element={<FarmerLogin />} />
            <Route path="/employee-login" element={<EmployeeLogin />} />
            <Route path="/employee-register" element={<EmployeeRegister />} />
            <Route path="/customer-login" element={<CustomerLogin />} />
            <Route path="/customer-register" element={<CustomerRegister />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            
            {/* Customer routes */}
            <Route path="/customer" element={
              <ProtectedRoute resource="customer" action="view">
                <CustomerHome />
              </ProtectedRoute>
            } />
            <Route path="/customer-home" element={<CustomerHome />} />
            <Route path="/customer-products" element={
              <ProtectedRoute resource="customer" action="view">
                <CustomerProducts />
              </ProtectedRoute>
            } />
            <Route path="/customer-order-history" element={
              <ProtectedRoute resource="customer" action="view">
                <CustomerOrderHistory />
              </ProtectedRoute>
            } />
            <Route path="/customer-profile" element={
              <ProtectedRoute resource="customer" action="view">
                <CustomerProfile />
              </ProtectedRoute>
            } />
            <Route path="/customer/profile" element={
              <ProtectedRoute resource="customer" action="view">
                <CustomerProfile />
              </ProtectedRoute>
            } />
            <Route path="/customer/cart" element={
              <ProtectedRoute resource="customer" action="view">
                <CartPage />
              </ProtectedRoute>
            } />
            <Route path="/customer/payment" element={
              <ProtectedRoute resource="customer" action="view">
                <PaymentPage />
              </ProtectedRoute>
            } />
            <Route path="/customer/order-tracking" element={
              <ProtectedRoute resource="customer" action="view">
                <OrderTracking />
              </ProtectedRoute>
            } />
            <Route path="/customer/order-history" element={
              <ProtectedRoute resource="customer" action="view">
                <OrderHistory />
              </ProtectedRoute>
            } />
            <Route path="/customer/order-receipt" element={
              <ProtectedRoute resource="customer" action="view">
                <OrderReceiptPage />
              </ProtectedRoute>
            } />
            <Route path="/order-receipt" element={<OrderReceiptPage />} />
            <Route path="/customer/tickets" element={
              <ProtectedRoute resource="customer" action="view">
                <CustomerTicketHistory />
              </ProtectedRoute>
            } />
            <Route path="/customer-ticket-history" element={
              <ProtectedRoute resource="customer" action="view">
                <CustomerTicketHistory />
              </ProtectedRoute>
            } />
            
            {/* Farmer routes */}
            <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
            <Route path="/farmer/:id" element={
              <ProtectedRoute resource="farmers" action="view">
                <FarmerDetails />
              </ProtectedRoute>
            } />
            <Route path="/farmer/tickets" element={
              <ProtectedRoute resource="farmers" action="view">
                <FarmerTicketHistory />
              </ProtectedRoute>
            } />
            
            {/* Employee/Admin Dashboard routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute resource="dashboard" action="view">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/farmers" element={
              <ProtectedRoute resource="farmers" action="view">
                <Farmers />
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute resource="products" action="view">
                <Products />
              </ProtectedRoute>
            } />
            <Route path="/sales" element={
              <ProtectedRoute resource="sales" action="view">
                <Sales />
              </ProtectedRoute>
            } />
            <Route path="/sales-dashboard" element={
              <ProtectedRoute resource="sales" action="view">
                <SalesDashboard />
              </ProtectedRoute>
            } />
            <Route path="/payment" element={
              <ProtectedRoute resource="sales" action="view">
                <PaymentPage />
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={
              <ProtectedRoute resource="transactions" action="view">
                <Transactions />
              </ProtectedRoute>
            } />
            <Route path="/coupons" element={
              <ProtectedRoute resource="coupons" action="view">
                <Coupons />
              </ProtectedRoute>
            } />
            <Route path="/employees" element={
              <ProtectedRoute resource="employees" action="view">
                <Employees />
              </ProtectedRoute>
            } />
            <Route path="/roles" element={
              <ProtectedRoute resource="roles" action="view">
                <Roles />
              </ProtectedRoute>
            } />
            <Route path="/tickets" element={
              <ProtectedRoute resource="tickets" action="view">
                <Tickets />
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute resource="customers" action="view">
                <Customers />
              </ProtectedRoute>
            } />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
