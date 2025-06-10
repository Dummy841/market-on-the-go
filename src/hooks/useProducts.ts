
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
      console.log('Adding product to Supabase:', productData);
      
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: productData.name,
          category: productData.category,
          unit: productData.unit,
          quantity: Number(productData.quantity),
          price_per_unit: Number(productData.price_per_unit),
          barcode: productData.barcode,
          farmer_id: productData.farmer_id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding product:', error);
        toast({
          title: "Error",
          description: `Failed to add product: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      console.log('Product added successfully:', data);
      
      // Update local state immediately for instant feedback
      setProducts(prevProducts => [data, ...prevProducts]);
      
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
      console.log('Updating product:', id, productData);
      
      const updateData: any = {};
      if (productData.name !== undefined) updateData.name = productData.name;
      if (productData.category !== undefined) updateData.category = productData.category;
      if (productData.unit !== undefined) updateData.unit = productData.unit;
      if (productData.quantity !== undefined) updateData.quantity = Number(productData.quantity);
      if (productData.price_per_unit !== undefined) updateData.price_per_unit = Number(productData.price_per_unit);
      if (productData.barcode !== undefined) updateData.barcode = productData.barcode;
      if (productData.farmer_id !== undefined) updateData.farmer_id = productData.farmer_id;

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating product:', error);
        toast({
          title: "Error",
          description: `Failed to update product: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      // Update local state immediately
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === id ? { ...product, ...data } : product
        )
      );

      toast({
        title: "Success",
        description: `${productData.name || 'Product'} was successfully updated`
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
          description: `Failed to delete product: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      // Update local state immediately
      setProducts(prevProducts => prevProducts.filter(product => product.id !== id));

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

    // Set up real-time subscription for products table
    let channel: any = null;
    
    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`products-changes-${Date.now()}`) // Use unique channel name
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'products'
          },
          (payload) => {
            console.log('Real-time product change:', payload);
            
            if (payload.eventType === 'INSERT') {
              setProducts(prevProducts => {
                // Check if product already exists to avoid duplicates
                const exists = prevProducts.some(p => p.id === payload.new.id);
                if (!exists) {
                  return [payload.new as Product, ...prevProducts];
                }
                return prevProducts;
              });
            } else if (payload.eventType === 'UPDATE') {
              setProducts(prevProducts =>
                prevProducts.map(product =>
                  product.id === payload.new.id ? payload.new as Product : product
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setProducts(prevProducts =>
                prevProducts.filter(product => product.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        console.log('Cleaning up products channel subscription');
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty dependency array to run only once

  return {
    products,
    loading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct
  };
};
