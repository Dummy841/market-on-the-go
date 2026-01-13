import { useState, useEffect } from 'react';
import { UtensilsCrossed, ShoppingBasket, Milk, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';

interface ServiceModule {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  image_url: string | null;
  slug: string;
}

interface ServiceCategoryProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
  imageUrl?: string | null;
  onClick: () => void;
}

const getIconForSlug = (slug: string) => {
  switch (slug) {
    case 'food_delivery':
      return <UtensilsCrossed className="h-5 w-5" />;
    case 'instamart':
      return <ShoppingBasket className="h-5 w-5" />;
    case 'dairy':
      return <Milk className="h-5 w-5" />;
    case 'services':
    default:
      return <Package className="h-5 w-5" />;
  }
};

const ServiceCategoryCard = ({
  title,
  subtitle,
  icon,
  badge,
  imageUrl,
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
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              icon
            )}
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
  const [modules, setModules] = useState<ServiceModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('service_modules')
        .select('id, title, subtitle, badge, image_url, slug')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      // Fallback to default modules
      setModules([
        { id: '1', title: 'FOOD DELIVERY', subtitle: 'YESVEMBER: LIVE NOW', badge: 'GET 65% OFF', slug: 'food_delivery', image_url: null },
        { id: '2', title: 'INSTAMART', subtitle: 'GROCERY DELIVERY', badge: 'FREE ₹125', slug: 'instamart', image_url: null },
        { id: '3', title: 'DAIRY PRODUCTS', subtitle: 'FRESH DAILY', badge: 'UP TO 50% OFF', slug: 'dairy', image_url: null },
        { id: '4', title: 'SERVICES', subtitle: 'OTHERS', badge: 'GET SERVICES IN MINS', slug: 'services', image_url: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (slug: string) => {
    navigate(`/restaurants?category=${slug}`);
  };

  if (loading) {
    return (
      <section className="py-4 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
          {modules.map((module) => (
            <ServiceCategoryCard 
              key={module.id}
              title={module.title} 
              subtitle={module.subtitle || ''} 
              badge={module.badge || undefined} 
              icon={getIconForSlug(module.slug)}
              imageUrl={module.image_url}
              onClick={() => handleCategoryClick(module.slug)} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};
