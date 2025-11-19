import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Clock, Star, Truck } from "lucide-react";
import heroFood from "@/assets/hero-food.jpg";
export const HeroSection = () => {
  return <section className="relative bg-gradient-hero overflow-hidden">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Delicious Food
                <br />
                <span className="text-white/90">Delivered Fast</span>
              </h1>
              <p className="text-xl text-white/80 max-w-lg">
                Order your favorite meals from top restaurants and get them delivered right to your doorstep in minutes.
              </p>
            </div>

            {/* Search */}
            

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 text-white">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-2 mx-auto">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="text-2xl font-bold">30 min</div>
                <div className="text-sm text-white/80">Average delivery</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-2 mx-auto">
                  <Star className="h-6 w-6" />
                </div>
                <div className="text-2xl font-bold">4.8</div>
                <div className="text-sm text-white/80">Average rating</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-2 mx-auto">
                  <Truck className="h-6 w-6" />
                </div>
                <div className="text-2xl font-bold">1000+</div>
                <div className="text-sm text-white/80">Restaurants</div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative animate-slide-up">
            <div className="relative">
              <img src={heroFood} alt="Delicious food spread" className="w-full h-auto rounded-2xl shadow-2xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            </div>
            
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-lg p-4 shadow-xl animate-bounce-gentle">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Free Delivery</div>
                  <div className="text-xs text-muted-foreground">On orders above ₹499</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};