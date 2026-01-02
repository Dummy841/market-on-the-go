import { Star, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
interface RestaurantCardProps {
  id: string;
  name: string;
  image: string;
  cuisine: string[];
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  deliveryFee: number;
  distance: string;
  offers?: string[];
  onClick?: () => void;
  isOffline?: boolean;
}
export const RestaurantCard = ({
  name,
  image,
  cuisine,
  rating,
  reviewsCount,
  deliveryTime,
  deliveryFee,
  distance,
  offers = [],
  onClick,
  isOffline = false
}: RestaurantCardProps) => {
  return <div className={`group bg-card rounded-xl shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${isOffline ? 'opacity-75' : ''}`} onClick={onClick}>
      {/* Square Image - 4:4 aspect ratio */}
      <div className="relative aspect-square overflow-hidden">
        <img src={image} alt={name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOffline ? 'grayscale' : ''}`} />
        {isOffline && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Badge variant="destructive" className="text-white text-xs">Offline</Badge>
          </div>}
      </div>

      {/* Content - Compact */}
      <div className="p-3 space-y-2">
        {/* Name */}
        <h3 className="font-semibold text-sm text-card-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
          {name}
        </h3>

        {/* Time and Distance in a row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{deliveryTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{distance}</span>
          </div>
        </div>

        {/* Action Button - 3:4 proportion */}
        <Button variant={isOffline ? "outline" : "food"} size="sm" className="w-3/4 h-8 text-xs" onClick={e => {
        e.stopPropagation();
        onClick?.();
      }} disabled={isOffline}>
          {isOffline ? "Closed" : "View Menu"}
        </Button>
      </div>
    </div>;
};