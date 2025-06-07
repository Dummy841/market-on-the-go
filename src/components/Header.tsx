
import React, { useState } from 'react';
import { ShoppingCart, Menu, X, Search, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { CartSidebar } from './CartSidebar';

const Header = () => {
  const { state } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">ShopCore</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200">Home</a>
              <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200">Electronics</a>
              <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200">Fashion</a>
              <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200">Home & Garden</a>
              <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200">Fitness</a>
            </nav>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Right side icons */}
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-700 hover:text-primary transition-colors duration-200">
                <User className="h-6 w-6" />
              </button>
              
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-700 hover:text-primary transition-colors duration-200"
              >
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-scale-in">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors duration-200"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t animate-fade-in">
              <div className="flex flex-col space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200 py-2">Home</a>
                <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200 py-2">Electronics</a>
                <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200 py-2">Fashion</a>
                <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200 py-2">Home & Garden</a>
                <a href="#" className="text-gray-700 hover:text-primary transition-colors duration-200 py-2">Fitness</a>
              </div>
            </div>
          )}
        </div>
      </header>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

export default Header;
