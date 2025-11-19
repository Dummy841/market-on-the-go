import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LocationPicker from './LocationPicker';

const sellerSchema = z.object({
  owner_name: z.string().min(2, 'Owner name must be at least 2 characters'),
  seller_name: z.string().min(2, 'Seller name must be at least 2 characters'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  account_number: z.string().min(8, 'Account number must be at least 8 digits'),
  ifsc_code: z.string().min(11, 'IFSC code must be 11 characters').max(11),
  bank_name: z.string().min(2, 'Bank name is required'),
  seller_latitude: z.number().optional(),
  seller_longitude: z.number().optional(),
  franchise_percentage: z.number().min(0, 'Franchise percentage must be at least 0').max(100, 'Franchise percentage cannot exceed 100'),
  status: z.enum(['active', 'inactive']).default('active'),
});

type SellerFormData = z.infer<typeof sellerSchema>;

interface CreateSellerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateSellerForm = ({ open, onOpenChange, onSuccess }: CreateSellerFormProps) => {
  const [uploading, setUploading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      status: 'active',
      franchise_percentage: 0
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = form;

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
        description: "Profile photo uploaded successfully!",
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

  const onSubmit = async (data: SellerFormData) => {
    try {
      const { error } = await supabase
        .from('sellers')
        .insert([
          {
            owner_name: data.owner_name,
            seller_name: data.seller_name,
            mobile: data.mobile,
            password_hash: data.password, // In production, hash the password
            account_number: data.account_number,
            ifsc_code: data.ifsc_code,
            bank_name: data.bank_name,
            seller_latitude: data.seller_latitude || null,
            seller_longitude: data.seller_longitude || null,
            franchise_percentage: data.franchise_percentage,
            status: data.status === 'active' ? 'approved' : 'inactive',
            profile_photo_url: profilePhotoUrl || null,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Seller created",
        description: "Seller has been created successfully!",
      });

      reset();
      setProfilePhotoUrl('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating seller:', error);
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: error.message || "Failed to create seller",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Seller</DialogTitle>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
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

          <div className="flex items-center space-x-2">
            <Switch
              id="status"
              checked={watch('status') === 'active'}
              onCheckedChange={(checked) => {
                setValue('status', checked ? 'active' : 'inactive');
              }}
            />
            <Label htmlFor="status">
              Active Seller ({watch('status') === 'active' ? 'Active' : 'Inactive'})
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
              {isSubmitting ? 'Creating...' : 'Create Seller'}
            </Button>
          </div>
        </form>

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
      </DialogContent>
    </Dialog>
  );
};

export default CreateSellerForm;