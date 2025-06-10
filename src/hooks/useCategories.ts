
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive"
        });
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error('Error in fetchCategories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (categoryData: { name: string; description?: string }) => {
    try {
      console.log('Adding category to Supabase:', categoryData);
      
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: categoryData.name,
          description: categoryData.description || null,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding category:', error);
        toast({
          title: "Error",
          description: `Failed to add category: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      console.log('Category added successfully:', data);
      
      // Update local state immediately
      setCategories(prevCategories => [...prevCategories, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: "Success",
        description: `${categoryData.name} category was successfully added`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in addCategory:', error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateCategory = async (id: string, categoryData: { name?: string; description?: string; is_active?: boolean }) => {
    try {
      console.log('Updating category:', id, categoryData);
      
      const { data, error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating category:', error);
        toast({
          title: "Error",
          description: `Failed to update category: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      // Update local state immediately
      setCategories(prevCategories => 
        prevCategories.map(category => 
          category.id === id ? { ...category, ...data } : category
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      toast({
        title: "Success",
        description: `${categoryData.name || 'Category'} was successfully updated`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in updateCategory:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting category:', error);
        toast({
          title: "Error",
          description: `Failed to delete category: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      // Update local state immediately
      setCategories(prevCategories => prevCategories.filter(category => category.id !== id));

      toast({
        title: "Success",
        description: "Category has been deleted successfully"
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchCategories();

    // Set up real-time subscription for categories table
    let channel: any = null;
    
    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`categories-changes-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'categories'
          },
          (payload) => {
            console.log('Real-time category change:', payload);
            
            if (payload.eventType === 'INSERT') {
              setCategories(prevCategories => {
                const exists = prevCategories.some(c => c.id === payload.new.id);
                if (!exists && payload.new.is_active) {
                  return [...prevCategories, payload.new as Category].sort((a, b) => a.name.localeCompare(b.name));
                }
                return prevCategories;
              });
            } else if (payload.eventType === 'UPDATE') {
              setCategories(prevCategories =>
                prevCategories.map(category =>
                  category.id === payload.new.id ? payload.new as Category : category
                ).filter(category => category.is_active).sort((a, b) => a.name.localeCompare(b.name))
              );
            } else if (payload.eventType === 'DELETE') {
              setCategories(prevCategories =>
                prevCategories.filter(category => category.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        console.log('Cleaning up categories channel subscription');
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    categories,
    loading,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory
  };
};
