import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Store } from "lucide-react";

interface DeliveryNotAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewRestaurants: () => void;
  restaurantName?: string;
}

export const DeliveryNotAvailableModal = ({
  isOpen,
  onClose,
  onViewRestaurants,
  restaurantName,
}: DeliveryNotAvailableModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <MapPin className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl">Does not deliver to your location</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {restaurantName ? (
              <>
                <span className="font-medium">{restaurantName}</span> doesn't deliver to addresses beyond 10km.
              </>
            ) : (
              "This restaurant doesn't deliver to addresses beyond 10km."
            )}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button 
            onClick={onViewRestaurants} 
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Store className="h-4 w-4 mr-2" />
            View Another Restaurant
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};