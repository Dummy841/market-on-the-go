
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  price_per_unit: number;
  barcode?: string;
  farmer_id?: string;
  created_at: string;
  updated_at: string;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive"
        });
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error in fetchProducts:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: productData.name,
          category: productData.category,
          unit: productData.unit,
          quantity: productData.quantity,
          price_per_unit: productData.price_per_unit,
          barcode: productData.barcode,
          farmer_id: productData.farmer_id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding product:', error);
        toast({
          title: "Error",
          description: "Failed to add product",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchProducts();
      toast({
        title: "Success",
        description: `${productData.name} was successfully added`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in addProduct:', error);
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: productData.name,
          category: productData.category,
          unit: productData.unit,
          quantity: productData.quantity,
          price_per_unit: productData.price_per_unit,
          barcode: productData.barcode,
          farmer_id: productData.farmer_id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating product:', error);
        toast({
          title: "Error",
          description: "Failed to update product",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchProducts();
      toast({
        title: "Success",
        description: `${productData.name} was successfully updated`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in updateProduct:', error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        toast({
          title: "Error",
          description: "Failed to delete product",
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchProducts();
      toast({
        title: "Success",
        description: "Product has been deleted successfully"
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct
  };
};
