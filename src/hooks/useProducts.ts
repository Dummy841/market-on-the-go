
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  category: string;
  farmer_id?: string | null;
  barcode?: string;
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
        .order('name', { ascending: true });

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
        .insert([productData])
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
      
      toast({
        title: "Success",
        description: `${productData.name} was successfully added`
      });
      
      // Don't update local state here - let the real-time subscription handle it
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
      
      const { data, error } = await supabase
        .from('products')
        .update(productData)
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

    // Set up real-time subscription for products table with improved duplicate prevention
    let channel: any = null;
    
    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`products-changes-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products'
          },
          (payload) => {
            console.log('Real-time product change:', payload);
            
            if (payload.eventType === 'INSERT') {
              setProducts(prevProducts => {
                // More robust duplicate check
                const exists = prevProducts.some(p => p.id === payload.new.id);
                if (!exists) {
                  console.log('Adding new product via realtime:', payload.new);
                  return [...prevProducts, payload.new as Product].sort((a, b) => a.name.localeCompare(b.name));
                } else {
                  console.log('Product already exists, skipping duplicate:', payload.new.id);
                  return prevProducts;
                }
              });
            } else if (payload.eventType === 'UPDATE') {
              setProducts(prevProducts =>
                prevProducts.map(product =>
                  product.id === payload.new.id ? payload.new as Product : product
                ).sort((a, b) => a.name.localeCompare(b.name))
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

    return () => {
      if (channel) {
        console.log('Cleaning up products channel subscription');
        supabase.removeChannel(channel);
      }
    };
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
