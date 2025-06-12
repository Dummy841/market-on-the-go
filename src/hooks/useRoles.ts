
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Role {
  id: string;
  name: string;
  description?: string;
  category?: string;
  permissions: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching roles:', error);
        toast({
          title: "Error",
          description: "Failed to load roles",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetched roles from database:', data);
      setRoles(data || []);
    } catch (error) {
      console.error('Error in fetchRoles:', error);
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addRole = async (roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding role to Supabase:', roleData);
      
      const { data, error } = await supabase
        .from('roles')
        .insert([roleData])
        .select()
        .single();

      if (error) {
        console.error('Error adding role:', error);
        toast({
          title: "Error",
          description: `Failed to add role: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      console.log('Role added successfully:', data);
      
      // Don't update local state here - let the real-time subscription handle it
      toast({
        title: "Success",
        description: `${roleData.name} role was successfully created`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in addRole:', error);
      toast({
        title: "Error",
        description: "Failed to add role",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateRole = async (id: string, roleData: Partial<Role>) => {
    try {
      console.log('Updating role:', id, roleData);
      
      const { data, error } = await supabase
        .from('roles')
        .update(roleData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating role:', error);
        toast({
          title: "Error",
          description: `Failed to update role: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      toast({
        title: "Success",
        description: `${roleData.name || 'Role'} was successfully updated`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in updateRole:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteRole = async (id: string) => {
    try {
      const { error } = await supabase
        .from('roles')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting role:', error);
        toast({
          title: "Error",
          description: `Failed to delete role: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      setRoles(prevRoles => prevRoles.filter(role => role.id !== id));

      toast({
        title: "Success",
        description: "Role has been deleted successfully"
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteRole:', error);
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchRoles();

    // Set up real-time subscription for roles table with improved duplicate prevention
    let channel: any = null;
    
    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`roles-changes-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'roles'
          },
          (payload) => {
            console.log('Real-time role change:', payload);
            
            if (payload.eventType === 'INSERT') {
              setRoles(prevRoles => {
                const exists = prevRoles.some(r => r.id === payload.new.id);
                if (!exists && payload.new.is_active) {
                  console.log('Adding new role via realtime:', payload.new);
                  return [...prevRoles, payload.new as Role].sort((a, b) => a.name.localeCompare(b.name));
                } else {
                  console.log('Role already exists or inactive, skipping:', payload.new.id);
                  return prevRoles;
                }
              });
            } else if (payload.eventType === 'UPDATE') {
              setRoles(prevRoles =>
                prevRoles.map(role =>
                  role.id === payload.new.id ? payload.new as Role : role
                ).filter(role => role.is_active).sort((a, b) => a.name.localeCompare(b.name))
              );
            } else if (payload.eventType === 'DELETE') {
              setRoles(prevRoles =>
                prevRoles.filter(role => role.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        console.log('Cleaning up roles channel subscription');
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    roles,
    loading,
    fetchRoles,
    addRole,
    updateRole,
    deleteRole
  };
};
