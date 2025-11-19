import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Calendar, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  name: string;
  mobile: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserProfileModal = ({ isOpen, onClose, user }: UserProfileModalProps) => {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {user.id.slice(0, 8)}</p>
                  </div>
                </div>
                <Badge variant={user.is_verified ? "default" : "secondary"}>
                  {user.is_verified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.mobile}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Status: {user.is_verified ? "Verified User" : "Pending Verification"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Account Information</h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
                <p>Last Updated: {new Date(user.updated_at).toLocaleDateString()}</p>
                <p>User Type: Customer</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};