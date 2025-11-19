import { UtensilsCrossed, ShoppingBasket, Utensils, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const BottomNav = () => {
  const navigate = useNavigate();

  const handleComingSoon = () => {
    toast.info("Coming soon! This feature is under development.");
  };

  const navItems = [
    {
      icon: UtensilsCrossed,
      label: "Food",
      onClick: () => navigate("/restaurants"),
      color: "text-primary"
    },
    {
      icon: ShoppingBasket,
      label: "Instamart",
      onClick: handleComingSoon,
      color: "text-green-600"
    },
    {
      icon: Utensils,
      label: "Dineout",
      onClick: handleComingSoon,
      color: "text-blue-600"
    },
    {
      icon: Gift,
      label: "Giftables",
      onClick: handleComingSoon,
      color: "text-purple-600"
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center flex-1 gap-1 hover:bg-muted/50 transition-colors rounded-lg py-2"
            >
              <Icon className={`h-6 w-6 ${item.color}`} />
              <span className="text-xs font-medium text-foreground">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
