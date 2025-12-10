import { UtensilsCrossed, ShoppingBasket, Wrench, Package } from "lucide-react";
import pizza from "@/assets/pizza.jpg";
import { useNavigate } from "react-router-dom";

interface ServiceCategoryProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  image: string;
  badge?: string;
  onClick: () => void;
}

const ServiceCategoryCard = ({
  title,
  subtitle,
  icon,
  image,
  badge,
  onClick
}: ServiceCategoryProps) => {
  return <div className="relative bg-card rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group" onClick={onClick}>
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground uppercase">{subtitle}</p>
            {badge}
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        
        <div className="mt-auto">
          
        </div>
      </div>
    </div>;
};

interface ServiceCategoriesProps {
  onFoodDeliveryClick: () => void;
}

export const ServiceCategories = ({
  onFoodDeliveryClick
}: ServiceCategoriesProps) => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: string) => {
    navigate(`/restaurants?category=${category}`);
  };

  return <section className="py-8 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
          <ServiceCategoryCard title="FOOD DELIVERY" subtitle="YESVEMBER: LIVE NOW" badge="GET 65% OFF" icon={<UtensilsCrossed className="h-6 w-6" />} image={pizza} onClick={() => handleCategoryClick('food_delivery')} />
          
          <ServiceCategoryCard title="INSTAMART" subtitle="GROCERY DELIVERY" badge="FREE ₹125" icon={<ShoppingBasket className="h-6 w-6" />} image={pizza} onClick={() => handleCategoryClick('instamart')} />
          
          <ServiceCategoryCard title="DINEOUT" subtitle="SERVICES" badge="UP TO 50% OFF" icon={<Wrench className="h-6 w-6" />} image={pizza} onClick={() => handleCategoryClick('dineout')} />
          
          <ServiceCategoryCard title="SERVICES" subtitle="OTHERS" badge="GET SERVICES IN MINS" icon={<Package className="h-6 w-6" />} image={pizza} onClick={() => handleCategoryClick('services')} />
        </div>
      </div>
    </section>;
};