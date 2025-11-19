import { Header } from "@/components/Header";
import { UniversalSearchBar } from "@/components/UniversalSearchBar";
import { FeaturedRestaurants } from "@/components/FeaturedRestaurants";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import OrderTrackingButton from "@/components/OrderTrackingButton";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import { useState } from "react";

const Restaurants = () => {
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  return <div className="min-h-screen bg-background pb-16">
      <Header />
      <main>
        <UniversalSearchBar />
        <section className="py-8 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              
            </div>
            <FeaturedRestaurants />
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