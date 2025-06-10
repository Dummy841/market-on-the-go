
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Product, useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Barcode, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductFormProps {
  farmerId?: string;
  onSubmit?: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  editProduct?: Product;
}

const ProductForm = ({ farmerId, onSubmit, onCancel, editProduct }: ProductFormProps) => {
  const { addProduct, updateProduct } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { toast } = useToast();
  const [name, setName] = useState(editProduct?.name || '');
  const [quantity, setQuantity] = useState(editProduct?.quantity.toString() || '1');
  const [unit, setUnit] = useState(editProduct?.unit || 'kg');
  const [pricePerUnit, setPricePerUnit] = useState(editProduct?.price_per_unit.toString() || '');
  const [category, setCategory] = useState(editProduct?.category || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default category when categories load
  useEffect(() => {
    if (!editProduct && categories.length > 0 && !category) {
      // Set default to 'General' if available, otherwise first category
      const defaultCategory = categories.find(c => c.name === 'General') || categories[0];
      if (defaultCategory) {
        setCategory(defaultCategory.name);
      }
    }
  }, [categories, editProduct, category]);

  // Generate barcode for new products or keep existing barcode for edits
  const generateBarcode = () => {
    return `BAR${Date.now()}${Math.floor(Math.random() * 1000)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !quantity || !pricePerUnit || !category) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate numeric fields
    const parsedQuantity = parseFloat(quantity);
    const parsedPrice = parseFloat(pricePerUnit);
    
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const productData = {
      name: name.trim(),
      quantity: parsedQuantity,
      unit,
      price_per_unit: parsedPrice,
      category,
      farmer_id: null, // Set to null instead of farmerId
      barcode: editProduct?.barcode || generateBarcode()
    };
    
    console.log('Submitting product data:', productData);
    
    try {
      if (editProduct) {
        // Update existing product
        const result = await updateProduct(editProduct.id, productData);
        if (result.success) {
          toast({
            title: "Success",
            description: "Product updated successfully"
          });
          onCancel(); // Close form
        }
      } else {
        // Add new product
        const result = await addProduct(productData);
        if (result.success) {
          toast({
            title: "Success", 
            description: "Product added successfully"
          });
          // Reset form
          setName('');
          setQuantity('1');
          setPricePerUnit('');
          const defaultCategory = categories.find(c => c.name === 'General') || categories[0];
          setCategory(defaultCategory?.name || '');
          onCancel(); // Close form
        }
      }
      
      // Call the optional onSubmit callback if provided
      if (onSubmit) {
        onSubmit(productData);
      }
      
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show alert if no categories are available
  if (!categoriesLoading && categories.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No categories available. Please add categories first from the Manage → Categories section.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name*</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category*</Label>
            <Select 
              value={category} 
              onValueChange={setCategory} 
              disabled={isSubmitting || categoriesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity*</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 1, 0.5"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Unit*</Label>
              <Select value={unit} onValueChange={setUnit} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="g">Gram (g)</SelectItem>
                  <SelectItem value="l">Liter (l)</SelectItem>
                  <SelectItem value="ml">Milliliter (ml)</SelectItem>
                  <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price per Unit (₹)*</Label>
              <Input 
                id="price"
                type="number" 
                min="0"
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="0.00"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {editProduct?.barcode && (
            <div className="space-y-2">
              <Label>Barcode</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Barcode className="h-4 w-4" />
                <span className="font-mono text-sm">{editProduct.barcode}</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 justify-end pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-agri-primary hover:bg-agri-secondary"
              disabled={isSubmitting || categoriesLoading || categories.length === 0}
            >
              {isSubmitting ? 'Saving...' : editProduct ? 'Update' : 'Add'} Product
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductForm;
