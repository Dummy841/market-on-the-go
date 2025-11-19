import { Header } from "@/components/Header";
import { UniversalSearchBar } from "@/components/UniversalSearchBar";
import { ServiceCategories } from "@/components/ServiceCategories";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import OrderTrackingButton from "@/components/OrderTrackingButton";
import OrderTrackingModal from "@/components/OrderTrackingModal";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      <main>
        <UniversalSearchBar />
        <ServiceCategories onFoodDeliveryClick={() => navigate('/restaurants')} />
      </main>
      <Footer />
      <BottomNav />
      <OrderTrackingButton onClick={() => setShowTrackingModal(true)} />
      <OrderTrackingModal isOpen={showTrackingModal} onClose={() => setShowTrackingModal(false)} />
    </div>
  );
};

export default Index;
