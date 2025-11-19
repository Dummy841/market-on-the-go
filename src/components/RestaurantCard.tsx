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
  return <div className={`group bg-card rounded-lg shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${isOffline ? 'opacity-75' : ''}`} onClick={onClick}>
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img src={image} alt={name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOffline ? 'grayscale' : ''}`} />
        {isOffline && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Badge variant="destructive" className="text-white">Currently Offline</Badge>
          </div>}
        {offers.length > 0 && !isOffline && <div className="absolute top-3 left-3">
            {offers.map((offer, index) => <Badge key={index} variant="secondary" className="mr-1">
                {offer}
              </Badge>)}
          </div>}
        {deliveryFee === 0 && !isOffline && <div className="absolute top-3 right-3">
            
          </div>}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <h3 className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          
        </div>

        {/* Rating and Time */}
        <div className="flex items-center justify-between">
          
          
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{deliveryTime}</span>
          </div>
        </div>

        {/* Location and Fee */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <MapPin className="h-3 w-3" />
            <span>{distance}</span>
          </div>
          
        </div>

        {/* Action Button */}
        <Button variant={isOffline ? "outline" : "food"} size="sm" className="w-full" onClick={e => {
        e.stopPropagation();
        onClick?.();
      }} disabled={isOffline}>
          {isOffline ? "Currently Closed" : "View Menu"}
        </Button>
      </div>
    </div>;
};