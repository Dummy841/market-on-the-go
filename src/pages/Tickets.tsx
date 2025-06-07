
import React, { useState, useEffect } from 'react';
import { Ticket } from '@/utils/types';
import TicketManagement from '@/components/ticket/TicketManagement';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';

// Placeholder for mock data - in a real app, this would come from an API
const MOCK_TICKETS: Ticket[] = [
  {
    id: '1',
    userId: 'farmer_1',
    userType: 'farmer',
    userName: 'John Farmer',
    userContact: '9876543210',
    message: 'I am having trouble adding new products to my inventory.',
    status: 'pending',
    dateCreated: new Date(2023, 4, 15),
    lastUpdated: new Date(2023, 4, 15)
  },
  {
    id: '2',
    userId: 'customer_1',
    userType: 'customer',
    userName: 'Jane Customer',
    userContact: '8765432109',
    message: 'My order #12345 has not been delivered yet, and it has been 5 days.',
    status: 'in-review',
    dateCreated: new Date(2023, 4, 10),
    lastUpdated: new Date(2023, 4, 12)
  },
  {
    id: '3',
    userId: 'farmer_2',
    userType: 'farmer',
    userName: 'Robert Grower',
    userContact: '7654321098',
    message: 'I need to update my bank account details.',
    status: 'closed',
    dateCreated: new Date(2023, 4, 5),
    lastUpdated: new Date(2023, 4, 7),
    resolution: 'Bank details updated successfully.'
  }
];

const TicketsPage: React.FC = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  
  useEffect(() => {
    // In a real app, this would be an API call
    // For now, load from localStorage or use mock data
    const savedTickets = localStorage.getItem('tickets');
    if (savedTickets) {
      try {
        setTickets(JSON.parse(savedTickets));
      } catch (error) {
        console.error('Error parsing tickets:', error);
        // Fallback to mock data
        setTickets(MOCK_TICKETS);
      }
    } else {
      setTickets(MOCK_TICKETS);
    }
  }, []);
  
  // Save tickets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tickets', JSON.stringify(tickets));
  }, [tickets]);

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets(prevTickets => 
      prevTickets.map(ticket => 
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
    
    toast({
      title: "Ticket Updated",
      description: `Ticket #${updatedTicket.id} has been updated to ${updatedTicket.status}.`,
    });
  };

  return (
    <div className="container mx-auto p-4 min-h-screen max-h-screen flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Ticket Management</h1>
      </div>
      
      {/* Mobile sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-lg p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b pb-4">
                <span className="text-lg font-bold">AgriPay Admin</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-auto"
                  onClick={() => setMenuOpen(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
              <Button
                variant="ghost"
                className="flex items-center justify-start gap-2"
                onClick={() => {
                  navigate(-1);
                  setMenuOpen(false);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1 overflow-y-auto">
        <TicketManagement tickets={tickets} onUpdateTicket={handleUpdateTicket} />
      </ScrollArea>
    </div>
  );
};

export default TicketsPage;
