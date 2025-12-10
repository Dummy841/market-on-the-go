import { Header } from "@/components/Header";
import { UniversalSearchBar } from "@/components/UniversalSearchBar";
import { FeaturedRestaurants } from "@/components/FeaturedRestaurants";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import OrderTrackingButton from "@/components/OrderTrackingButton";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

const Restaurants = () => {
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'food_delivery';

  const getCategoryTitle = () => {
    switch(category) {
      case 'food_delivery': return 'Food Delivery';
      case 'instamart': return 'Insta Mart';
      case 'dineout': return 'Dine Out';
      case 'services': return 'Services';
      default: return 'Restaurants';
    }
  };

  return <div className="min-h-screen bg-background pb-16">
      <Header />
      <main>
        <UniversalSearchBar />
        <section className="py-8 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground">{getCategoryTitle()}</h2>
            </div>
            <FeaturedRestaurants category={category} />
          </div>
        </section>
      </main>
      <Footer />
      <BottomNav />
      <OrderTrackingButton onClick={() => setShowTrackingModal(true)} />
      <OrderTrackingModal isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} />
    </div>;
};
export default Restaurants;