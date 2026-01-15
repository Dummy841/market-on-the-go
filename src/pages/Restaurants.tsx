import { Header } from "@/components/Header";
import { FeaturedRestaurants } from "@/components/FeaturedRestaurants";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import OrderTrackingButton from "@/components/OrderTrackingButton";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Restaurants = () => {
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'food_delivery';

  const getCategoryTitle = () => {
    switch(category) {
      case 'food_delivery': return 'Food Delivery';
      case 'instamart': return 'Instamart';
      case 'dairy': return 'Dairy Products';
      case 'services': return 'Services';
      default: return 'Restaurants';
    }
  };

  return <div className="min-h-screen bg-background pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <Header />
      <main>
        {/* Search Bar */}
        <div className="container mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-full border-muted-foreground/20"
            />
          </div>
        </div>
        
        <section className="py-4 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground">{getCategoryTitle()}</h2>
            </div>
            <FeaturedRestaurants category={category} searchQuery={searchQuery} />
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