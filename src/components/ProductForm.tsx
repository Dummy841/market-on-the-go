
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Product } from '@/utils/types';
import { Barcode } from 'lucide-react';

interface ProductFormProps {
  farmerId: string;
  onSubmit: (product: Product) => void;
  onCancel: () => void;
  editProduct?: Product;
}

const ProductForm = ({ farmerId, onSubmit, onCancel, editProduct }: ProductFormProps) => {
  const [name, setName] = useState(editProduct?.name || '');
  const [quantity, setQuantity] = useState(editProduct?.quantity.toString() || '1');
  const [unit, setUnit] = useState(editProduct?.unit || 'kg');
  const [pricePerUnit, setPricePerUnit] = useState(editProduct?.pricePerUnit.toString() || '');

  // Generate barcode for new products or keep existing barcode for edits
  const generateBarcode = () => {
    return `BAR${Date.now()}${Math.floor(Math.random() * 1000)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !quantity || !pricePerUnit) {
      return;
    }
    
    const product: Product = {
      id: editProduct?.id || `prod_${Date.now()}`,
      name,
      quantity: parseFloat(quantity),
      unit,
      pricePerUnit: parseFloat(pricePerUnit),
      category: 'General', // Default category since it's removed from form
      date: editProduct?.date || new Date(),
      farmerId,
      barcode: editProduct?.barcode || generateBarcode() // Keep existing barcode or generate new one
    };
    
    onSubmit(product);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 1, 0.5"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
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
              <Label htmlFor="price">Price per Unit (₹)</Label>
              <Input 
                id="price"
                type="number" 
                min="0"
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
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
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-agri-primary hover:bg-agri-secondary">
              {editProduct ? 'Update' : 'Add'} Product
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductForm;
