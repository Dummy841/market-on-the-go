import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';

interface Subcategory {
  id: string;
  name: string;
  category: string;
}

interface SellerItemsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SellerItemsForm = ({ open, onOpenChange, onSuccess }: SellerItemsFormProps) => {
  const [formData, setFormData] = useState({
    item_name: '',
    seller_price: '',
    item_info: '',
    subcategory_id: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const { toast } = useToast();
  const { seller } = useSellerAuth();

  // Fetch subcategories based on seller's categories
  useEffect(() => {
    if (open && seller) {
      fetchSubcategories();
    }
  }, [open, seller]);

  const fetchSubcategories = async () => {
    if (!seller) return;

    try {
      // Get seller's categories
      const sellerCategories: string[] = [];
      if (seller.category) {
        sellerCategories.push(seller.category);
      }
      if (seller.categories) {
        const additionalCategories = seller.categories.split(',').map(c => c.trim());
        additionalCategories.forEach(cat => {
          if (!sellerCategories.includes(cat)) {
            sellerCategories.push(cat);
          }
        });
      }

      if (sellerCategories.length === 0) {
        setSubcategories([]);
        return;
      }

      // Fetch subcategories that match seller's categories
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, category')
        .eq('is_active', true)
        .in('category', sellerCategories)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

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
    setLoading(true);

    try {
      if (!seller) {
        throw new Error('No seller found');
      }

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          throw new Error('Failed to upload image');
        }
      }

      const { error } = await supabase
        .from('items')
        .insert({
          seller_id: seller.id,
          item_name: formData.item_name,
          item_photo_url: imageUrl,
          seller_price: parseFloat(formData.seller_price),
          franchise_price: parseFloat(formData.seller_price),
          item_info: formData.item_info || null,
          subcategory_id: formData.subcategory_id || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added successfully!",
      });

      // Reset form
      setFormData({
        item_name: '',
        seller_price: '',
        item_info: '',
        subcategory_id: ''
      });
      setImageFile(null);
      setImagePreview(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
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
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="mt-2 text-sm text-muted-foreground">Upload item photo</span>
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

          {/* Subcategory Dropdown */}
          {subcategories.length > 0 && (
            <div>
              <Label htmlFor="subcategory">Subcategory</Label>
              <Select
                value={formData.subcategory_id}
                onValueChange={(value) => handleInputChange('subcategory_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((subcat) => (
                    <SelectItem key={subcat.id} value={subcat.id}>
                      {subcat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="item_info">Item Info (Optional)</Label>
            <textarea
              id="item_info"
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Add description about this item (e.g., ingredients, serving size, etc.)"
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
              {loading ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SellerItemsForm;
