
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Ticket, Customer } from '@/utils/types';
import TicketDialog from '@/components/ticket/TicketDialog';
import { 
  ShoppingCart, 
  User,
  LogOut,
  Package,
  List,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

const CustomerTicketHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Check if customer is logged in
  const customerString = localStorage.getItem('currentCustomer');
  const customer = customerString ? JSON.parse(customerString) : null;
  
  useEffect(() => {
    if (!customer) {
      navigate('/customer-login');
      return;
    }

    // In a real app, we would fetch the tickets from an API
    // For now, we'll load from localStorage or use an empty array
    const savedTickets = localStorage.getItem('tickets');
    if (savedTickets) {
      const allTickets = JSON.parse(savedTickets);
      // Filter tickets for current customer only
      const customerTickets = allTickets.filter(
        (ticket: Ticket) => ticket.userId === customer.id
      );
      setTickets(customerTickets);
    }
  }, [customer, navigate]);
  
  const handleLogout = () => {
    localStorage.removeItem('currentCustomer');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
    navigate('/app-landing');
  };
  
  const handleTicketSubmit = (ticket: Omit<Ticket, 'id'>) => {
    // Create a new ticket with ID
    const newTicket: Ticket = {
      ...ticket,
      id: `${Date.now()}`,
      dateCreated: new Date(),
      lastUpdated: new Date(),
      status: 'pending'
    };
    
    // Add to existing tickets
    const savedTickets = localStorage.getItem('tickets');
    const allTickets = savedTickets ? JSON.parse(savedTickets) : [];
    const updatedTickets = [...allTickets, newTicket];
    
    // Save to localStorage
    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    
    // Update local state
    setTickets(prev => [...prev, newTicket]);
    
    toast({
      title: "Ticket Submitted",
      description: "Your support ticket has been submitted.",
      variant: "default",
    });
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100">Pending</Badge>;
      case 'in-review':
        return <Badge variant="outline" className="bg-blue-100">In Review</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-green-100">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top navigation bar */}
      <header className="bg-white shadow p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/customer-home')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Package className="h-6 w-6 text-agri-primary" />
            <span className="text-xl font-bold hidden sm:inline">AgriPay</span>
          </div>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/customer-profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/order-history" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>My Orders</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">Cart</span>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Support Tickets</h1>
          <TicketDialog
            userType="customer"
            userId={customer.id}
            userName={customer.name}
            userContact={customer.phone || ""}
            onSubmit={handleTicketSubmit}
            buttonText="Raise a New Ticket"
          />
        </div>
        
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <p className="text-muted-foreground text-center mb-4">You haven't raised any support tickets yet.</p>
              <TicketDialog
                userType="customer"
                userId={customer.id}
                userName={customer.name}
                userContact={customer.phone || ""}
                onSubmit={handleTicketSubmit}
                buttonText="Raise Your First Ticket"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket #{ticket.id}</p>
                      <CardTitle className="text-lg">{ticket.message.substring(0, 50)}{ticket.message.length > 50 ? '...' : ''}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end">
                      {getStatusBadge(ticket.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(ticket.dateCreated), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{ticket.message}</p>
                  
                  {ticket.resolution && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-sm font-medium">Resolution:</p>
                      <p className="text-sm text-muted-foreground">{ticket.resolution}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerTicketHistory;
