import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';

interface Item {
  id: string;
  item_name: string;
  item_photo_url?: string;
  seller_price: number;
  item_info?: string | null;
}

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSuccess?: () => void;
}

const EditItemModal = ({ open, onOpenChange, item, onSuccess }: EditItemModalProps) => {
  const [formData, setFormData] = useState({
    item_name: '',
    seller_price: '',
    item_info: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { seller } = useSellerAuth();

  useEffect(() => {
    if (item && open) {
      setFormData({
        item_name: item.item_name,
        seller_price: item.seller_price.toString(),
        item_info: item.item_info || ''
      });
      setImagePreview(item.item_photo_url || null);
      setImageFile(null);
    }
  }, [item, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `items/${seller?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('seller-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('seller-profiles')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setLoading(true);

    try {
      let imageUrl = item.item_photo_url;
      
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (!uploadedUrl) {
          throw new Error('Failed to upload image');
        }
        imageUrl = uploadedUrl;
      } else if (!imagePreview) {
        imageUrl = null;
      }

      const { error } = await supabase
        .from('items')
        .update({
          item_name: formData.item_name,
          item_photo_url: imageUrl,
          seller_price: parseFloat(formData.seller_price),
          franchise_price: parseFloat(formData.seller_price),
          item_info: formData.item_info || null
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item updated successfully!",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="item_name">Item Name</Label>
            <Input
              id="item_name"
              value={formData.item_name}
              onChange={(e) => handleInputChange('item_name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="item_photo">Item Photo</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="mt-2 text-sm text-gray-500">Upload item photo</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="seller_price">Price (₹)</Label>
            <Input
              id="seller_price"
              type="number"
              step="0.01"
              value={formData.seller_price}
              onChange={(e) => handleInputChange('seller_price', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="item_info">Item Info (Optional)</Label>
            <textarea
              id="item_info"
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Add description about this item"
              value={formData.item_info}
              onChange={(e) => handleInputChange('item_info', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemModal;
