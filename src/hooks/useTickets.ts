
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Ticket {
  id: string;
  user_id: string;
  user_name: string;
  user_type: string;
  user_contact: string;
  message: string;
  status: string;
  assigned_to: string | null;
  resolution: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        toast({
          title: "Error",
          description: "Failed to load tickets",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetched tickets:', data);
      setTickets(data || []);
    } catch (error) {
      console.error('Error in fetchTickets:', error);
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addTicket = async (ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding ticket to Supabase:', ticketData);
      
      const { data, error } = await supabase
        .from('tickets')
        .insert([{
          user_id: ticketData.user_id,
          user_name: ticketData.user_name,
          user_type: ticketData.user_type,
          user_contact: ticketData.user_contact,
          message: ticketData.message,
          status: ticketData.status || 'pending',
          assigned_to: ticketData.assigned_to,
          resolution: ticketData.resolution,
          attachment_url: ticketData.attachment_url
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding ticket:', error);
        toast({
          title: "Error",
          description: `Failed to create ticket: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      console.log('Ticket added successfully:', data);
      await fetchTickets();
      toast({
        title: "Success",
        description: "Ticket was successfully created"
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in addTicket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateTicket = async (id: string, ticketData: Partial<Ticket>) => {
    try {
      console.log('Updating ticket:', id, ticketData);
      
      const updateData: any = {};
      if (ticketData.status !== undefined) updateData.status = ticketData.status;
      if (ticketData.assigned_to !== undefined) updateData.assigned_to = ticketData.assigned_to;
      if (ticketData.resolution !== undefined) updateData.resolution = ticketData.resolution;
      if (ticketData.message !== undefined) updateData.message = ticketData.message;

      const { data, error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating ticket:', error);
        toast({
          title: "Error",
          description: `Failed to update ticket: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchTickets();
      toast({
        title: "Success",
        description: "Ticket was successfully updated"
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error in updateTicket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting ticket:', error);
        toast({
          title: "Error",
          description: `Failed to delete ticket: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error };
      }

      await fetchTickets();
      toast({
        title: "Success",
        description: "Ticket has been deleted successfully"
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteTicket:', error);
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    loading,
    fetchTickets,
    addTicket,
    updateTicket,
    deleteTicket
  };
};
