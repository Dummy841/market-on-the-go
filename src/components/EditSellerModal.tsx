import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Seller } from '@/contexts/SellerAuthContext';
import LocationPicker from './LocationPicker';

const editSellerSchema = z.object({
  owner_name: z.string().min(2, 'Owner name must be at least 2 characters'),
  seller_name: z.string().min(2, 'Seller name must be at least 2 characters'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  account_number: z.string().min(8, 'Account number must be at least 8 digits'),
  ifsc_code: z.string().min(11, 'IFSC code must be 11 characters').max(11),
  bank_name: z.string().min(2, 'Bank name is required'),
  seller_latitude: z.number().optional(),
  seller_longitude: z.number().optional(),
  franchise_percentage: z.number().min(0, 'Franchise percentage must be at least 0').max(100, 'Franchise percentage cannot exceed 100'),
  status: z.enum(['approved', 'pending', 'inactive']),
  is_online: z.boolean(),
});

type EditSellerFormData = z.infer<typeof editSellerSchema>;

interface EditSellerModalProps {
  seller: Seller | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditSellerModal = ({ seller, open, onOpenChange, onSuccess }: EditSellerModalProps) => {
  const [uploading, setUploading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const { toast } = useToast();
  
  const form = useForm<EditSellerFormData>({
    resolver: zodResolver(editSellerSchema),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = form;

  useEffect(() => {
    if (seller && open) {
      reset({
        owner_name: seller.owner_name,
        seller_name: seller.seller_name,
        mobile: seller.mobile,
        account_number: seller.account_number,
        ifsc_code: seller.ifsc_code,
        bank_name: seller.bank_name,
        seller_latitude: seller.seller_latitude || undefined,
        seller_longitude: seller.seller_longitude || undefined,
        franchise_percentage: seller.franchise_percentage || 0,
        status: seller.status as 'approved' | 'pending' | 'inactive',
        is_online: seller.is_online,
      });
      setProfilePhotoUrl(seller.profile_photo_url || '');
    }
  }, [seller, open, reset]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('seller-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('seller-profiles')
        .getPublicUrl(filePath);

      setProfilePhotoUrl(publicUrl);
      toast({
        title: "Photo uploaded",
        description: "Profile photo updated successfully!",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload profile photo",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: EditSellerFormData) => {
    if (!seller) return;

    try {
      const { error } = await supabase
        .from('sellers')
        .update({
          owner_name: data.owner_name,
          seller_name: data.seller_name,
          mobile: data.mobile,
          account_number: data.account_number,
          ifsc_code: data.ifsc_code,
          bank_name: data.bank_name,
          seller_latitude: data.seller_latitude || null,
          seller_longitude: data.seller_longitude || null,
          franchise_percentage: data.franchise_percentage,
          status: data.status,
          is_online: data.is_online,
          profile_photo_url: profilePhotoUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', seller.id);

      if (error) throw error;

      toast({
        title: "Seller updated",
        description: "Seller information has been updated successfully!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating seller:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update seller",
      });
    }
  };

  if (!seller) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Seller</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile_photo">Profile Photo</Label>
              <Input
                id="profile_photo"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
              {profilePhotoUrl && (
                <img src={profilePhotoUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name</Label>
              <Input
                id="owner_name"
                {...register('owner_name')}
                placeholder="Enter owner name"
              />
              {errors.owner_name && (
                <p className="text-sm text-destructive">{errors.owner_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="seller_name">Seller Name</Label>
              <Input
                id="seller_name"
                {...register('seller_name')}
                placeholder="Enter seller/business name"
              />
              {errors.seller_name && (
                <p className="text-sm text-destructive">{errors.seller_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                {...register('mobile')}
                placeholder="Enter mobile number"
              />
              {errors.mobile && (
                <p className="text-sm text-destructive">{errors.mobile.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                {...register('account_number')}
                placeholder="Enter bank account number"
              />
              {errors.account_number && (
                <p className="text-sm text-destructive">{errors.account_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifsc_code">IFSC Code</Label>
              <Input
                id="ifsc_code"
                {...register('ifsc_code')}
                placeholder="Enter IFSC code"
                maxLength={11}
              />
              {errors.ifsc_code && (
                <p className="text-sm text-destructive">{errors.ifsc_code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                {...register('bank_name')}
                placeholder="Enter bank name"
              />
              {errors.bank_name && (
                <p className="text-sm text-destructive">{errors.bank_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Seller Location</Label>
              <div className="flex space-x-2">
                <Input
                  value={
                    watch('seller_latitude') && watch('seller_longitude')
                      ? `${watch('seller_latitude')?.toFixed(6)}, ${watch('seller_longitude')?.toFixed(6)}`
                      : ''
                  }
                  placeholder="Click to select location on map"
                  readOnly
                  onClick={() => setShowLocationPicker(true)}
                  className="cursor-pointer"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLocationPicker(true)}
                >
                  Select on Map
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchise_percentage">Franchise Percentage (%)</Label>
              <Input
                id="franchise_percentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register('franchise_percentage', { valueAsNumber: true })}
                placeholder="Enter franchise percentage"
              />
              {errors.franchise_percentage && (
                <p className="text-sm text-destructive">{errors.franchise_percentage.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as 'approved' | 'pending' | 'inactive')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_online"
                checked={watch('is_online')}
                onCheckedChange={(checked) => setValue('is_online', checked)}
              />
              <Label htmlFor="is_online">
                Online Status ({watch('is_online') ? 'Online' : 'Offline'})
              </Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Seller'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <LocationPicker
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        onLocationSelect={(lat, lng) => {
          setValue('seller_latitude', lat);
          setValue('seller_longitude', lng);
        }}
        initialLat={watch('seller_latitude') || 28.6139}
        initialLng={watch('seller_longitude') || 77.2090}
      />
    </>
  );
};

export default EditSellerModal;