import { UtensilsCrossed, ShoppingBasket, Milk, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ServiceCategoryProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
  onClick: () => void;
}

const ServiceCategoryCard = ({
  title,
  subtitle,
  icon,
  badge,
  onClick
}: ServiceCategoryProps) => {
  return (
    <div 
      className="relative bg-card rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden group" 
      onClick={onClick}
    >
      <div className="p-3 flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1">
            <h3 className="font-bold text-sm text-foreground mb-0.5">{title}</h3>
            <p className="text-[10px] text-muted-foreground uppercase">{subtitle}</p>
            {badge && <p className="text-xs font-semibold text-primary mt-1">{badge}</p>}
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
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

  return (
    <section className="py-4 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
          <ServiceCategoryCard 
            title="FOOD DELIVERY" 
            subtitle="YESVEMBER: LIVE NOW" 
            badge="GET 65% OFF" 
            icon={<UtensilsCrossed className="h-5 w-5" />} 
            onClick={() => handleCategoryClick('food_delivery')} 
          />
          
          <ServiceCategoryCard 
            title="INSTAMART" 
            subtitle="GROCERY DELIVERY" 
            badge="FREE ₹125" 
            icon={<ShoppingBasket className="h-5 w-5" />} 
            onClick={() => handleCategoryClick('instamart')} 
          />
          
          <ServiceCategoryCard 
            title="DAIRY PRODUCTS" 
            subtitle="FRESH DAILY" 
            badge="UP TO 50% OFF" 
            icon={<Milk className="h-5 w-5" />} 
            onClick={() => handleCategoryClick('dairy')} 
          />
          
          <ServiceCategoryCard 
            title="SERVICES" 
            subtitle="OTHERS" 
            badge="GET SERVICES IN MINS" 
            icon={<Package className="h-5 w-5" />} 
            onClick={() => handleCategoryClick('services')} 
          />
        </div>
      </div>
    </section>
  );
};