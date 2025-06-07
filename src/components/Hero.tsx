
import React from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Discover Amazing
              <span className="text-primary block">Products</span>
            </h1>
            <p className="text-xl text-gray-600 mt-6 leading-relaxed">
              Shop the latest trends and find everything you need in one place. 
              Quality products, competitive prices, and exceptional service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button className="bg-primary text-white px-8 py-4 rounded-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 hover-scale">
                <ShoppingBag className="h-5 w-5" />
                Shop Now
                <ArrowRight className="h-5 w-5" />
              </button>
              <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-all duration-200 hover-scale">
                Learn More
              </button>
            </div>
          </div>
          <div className="relative animate-fade-in">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop&crop=center"
                alt="Shopping experience"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-lg animate-scale-in">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-full">
                    <ShoppingBag className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Free Shipping</p>
                    <p className="text-sm text-gray-600">On orders over $50</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
