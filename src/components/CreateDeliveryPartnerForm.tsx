import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Eye, EyeOff } from "lucide-react";

interface DeliveryPartner {
  id: string;
  name: string;
  mobile: string;
  profile_photo_url: string | null;
  is_active: boolean;
  is_online: boolean;
  created_at: string;
}

interface CreateDeliveryPartnerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingPartner?: DeliveryPartner | null;
}

interface FormData {
  name: string;
  mobile: string;
  password: string;
  profilePhoto?: FileList;
}

const CreateDeliveryPartnerForm = ({ open, onOpenChange, onSuccess, editingPartner }: CreateDeliveryPartnerFormProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>();

  // Populate form when editing
  React.useEffect(() => {
    if (editingPartner) {
      setValue('name', editingPartner.name);
      setValue('mobile', editingPartner.mobile);
      setValue('password', ''); // Don't populate password for security
    } else {
      reset();
    }
  }, [editingPartner, setValue, reset]);

  const uploadProfilePhoto = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `delivery-partners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('seller-profiles')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('seller-profiles')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      let profilePhotoUrl = null;
      if (data.profilePhoto && data.profilePhoto[0]) {
        profilePhotoUrl = await uploadProfilePhoto(data.profilePhoto[0]);
        if (!profilePhotoUrl) {
          toast({
            title: "Error",
            description: "Failed to upload profile photo",
            variant: "destructive",
          });
          return;
        }
      }

      let error;
      if (editingPartner) {
        const updateData: any = {
          name: data.name,
          mobile: data.mobile,
        };
        if (profilePhotoUrl) {
          updateData.profile_photo_url = profilePhotoUrl;
        }
        // Only update password if provided
        if (data.password) {
          const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', { 
            password: data.password 
          });
          if (hashError) throw hashError;
          updateData.password_hash = hashedPassword;
        }
        
        const result = await supabase
          .from('delivery_partners')
          .update(updateData)
          .eq('id', editingPartner.id);
        error = result.error;
      } else {
        // Hash password for new delivery partner
        const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', { 
          password: data.password 
        });
        if (hashError) throw hashError;
        
        const result = await supabase
          .from('delivery_partners')
          .insert({
            name: data.name,
            mobile: data.mobile,
            password_hash: hashedPassword as any,
            profile_photo_url: profilePhotoUrl,
          });
        error = result.error;
      }

      if (error) {
        console.error('Error saving delivery partner:', error);
        toast({
          title: "Error",
          description: `Failed to ${editingPartner ? 'update' : 'create'} delivery partner`,
          variant: "destructive",
        });
        return;
      }
      
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingPartner ? 'Edit Delivery Partner' : 'Create Delivery Partner'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="Enter full name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              {...register("mobile", { 
                required: "Mobile number is required",
                pattern: {
                  value: /^[0-9]{10}$/,
                  message: "Please enter a valid 10-digit mobile number"
                }
              })}
              placeholder="Enter mobile number"
              maxLength={10}
            />
            {errors.mobile && (
              <p className="text-sm text-destructive">{errors.mobile.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password {editingPartner && "(Leave empty to keep current password)"}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password", { 
                  required: editingPartner ? false : "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters long"
                  }
                })}
                placeholder={editingPartner ? "Enter new password (optional)" : "Enter password"}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profilePhoto">Profile Photo (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="profilePhoto"
                type="file"
                accept="image/*"
                {...register("profilePhoto")}
                className="file:mr-2 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || uploading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                editingPartner ? "Update Partner" : "Create Partner"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDeliveryPartnerForm;