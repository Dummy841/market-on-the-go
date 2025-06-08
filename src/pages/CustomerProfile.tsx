import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Package, ArrowLeft, User, Home, MapPin, Mail, Phone, Ticket } from 'lucide-react';
import TicketDialog from '@/components/ticket/TicketDialog';
import { Ticket as TicketType } from '@/utils/types';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get customer data from localStorage
  const customerString = localStorage.getItem('currentCustomer');
  const initialCustomer = customerString ? JSON.parse(customerString) : null;
  
  const [customer, setCustomer] = useState(initialCustomer || {
    name: '',
    mobile: '',
    email: '',
    address: '',
    pincode: ''
  });
  
  // Redirect if not logged in
  useEffect(() => {
    if (!initialCustomer) {
      navigate('/customer-login');
    }
  }, [initialCustomer, navigate]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Update customer in localStorage
      localStorage.setItem('currentCustomer', JSON.stringify(customer));
      
      // Update customer in customers array
      const customers = JSON.parse(localStorage.getItem('customers') || '[]');
      const updatedCustomers = customers.map((c: any) => 
        c.id === customer.id ? customer : c
      );
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));
      
      setIsLoading(false);
      setIsEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully"
      });
    }, 1000);
  };

  const handleTicketSubmit = (ticketData: {
    user_id: string;
    user_type: string;
    user_name: string;
    user_contact: string;
    message: string;
    status: string;
    attachment_url?: string;
  }) => {
    // Map snake_case properties to camelCase for Ticket type
    const newTicket: TicketType = {
      id: `${Date.now()}`,
      userId: ticketData.user_id,
      userType: ticketData.user_type as 'farmer' | 'customer',
      userName: ticketData.user_name,
      userContact: ticketData.user_contact,
      message: ticketData.message,
      status: ticketData.status as 'pending' | 'in-review' | 'closed',
      dateCreated: new Date(),
      lastUpdated: new Date(),
      attachmentUrl: ticketData.attachment_url
    };
    
    // Add to existing tickets
    const savedTickets = localStorage.getItem('tickets');
    const allTickets = savedTickets ? JSON.parse(savedTickets) : [];
    const updatedTickets = [...allTickets, newTicket];
    
    // Save to localStorage
    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    
    toast({
      title: "Ticket Submitted",
      description: "Your support ticket has been submitted.",
      variant: "default",
    });
  };
  
  if (!initialCustomer) {
    return null; // Redirect handled in useEffect
  }
  
  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <header className="container mx-auto max-w-md mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/customer-home')}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-agri-primary" />
            <span className="text-lg font-bold">AgriPay</span>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span>My Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing ? (
              <>
                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">{customer.name}</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mobile</p>
                      <p>{customer.mobile}</p>
                    </div>
                  </div>
                  
                  {customer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p>{customer.email}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p>{customer.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pincode</p>
                      <p>{customer.pincode}</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-6"
                >
                  Edit Profile
                </Button>
              </>
            ) : (
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={customer.name}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    value={customer.mobile}
                    onChange={handleInputChange}
                    disabled={true} // Cannot change mobile as it's the primary identifier
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={customer.email || ''}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={customer.address}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    value={customer.pincode}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-agri-primary hover:bg-agri-secondary"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
            
            {!isEditing && (
              <div className="pt-4 space-y-3">
                <Link to="/customer-order-history">
                  <Button variant="outline" className="w-full">
                    View Order History
                  </Button>
                </Link>
                
                <div className="flex gap-2">
                  <TicketDialog
                    userType="customer"
                    userId={customer.id || customer.mobile}
                    userName={customer.name}
                    userContact={customer.mobile}
                    onSubmit={handleTicketSubmit}
                    buttonText="Raise a Ticket"
                  />
                  <Link to="/customer-ticket-history" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Ticket className="h-4 w-4 mr-2" />
                      Ticket History
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerProfile;
