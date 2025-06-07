
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import Sidebar from '@/components/Sidebar';
import FarmerForm from '@/components/FarmerForm';
import { Farmer } from '@/utils/types';
import { Search, Plus, User, Edit, Eye } from 'lucide-react';

const Farmers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | undefined>(undefined);
  
  // Load farmers from localStorage on component mount
  useEffect(() => {
    const loadFarmers = () => {
      const savedFarmers = localStorage.getItem('farmers');
      if (savedFarmers) {
        try {
          const parsedFarmers = JSON.parse(savedFarmers);
          // Convert date strings back to Date objects
          const farmersWithDates = parsedFarmers.map((farmer: any) => ({
            ...farmer,
            dateJoined: new Date(farmer.dateJoined),
            products: farmer.products || [],
            transactions: farmer.transactions || []
          }));
          setFarmers(farmersWithDates);
        } catch (error) {
          console.error('Error loading farmers:', error);
          setFarmers([]);
        }
      }
    };

    loadFarmers();
    
    // Listen for storage changes
    const handleStorageChange = () => {
      loadFarmers();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Filter farmers based on search
  const filteredFarmers = farmers.filter(farmer => 
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    farmer.phone.includes(searchTerm)
  );
  
  const handleAddFarmer = (newFarmer: Farmer) => {
    let updatedFarmers;
    
    if (selectedFarmer) {
      // Update existing farmer
      updatedFarmers = farmers.map(farmer => 
        farmer.id === newFarmer.id ? newFarmer : farmer
      );
    } else {
      // Add new farmer
      updatedFarmers = [...farmers, newFarmer];
    }
    
    setFarmers(updatedFarmers);
    
    // Save to localStorage
    localStorage.setItem('farmers', JSON.stringify(updatedFarmers));
    
    setIsDialogOpen(false);
    setSelectedFarmer(undefined);
  };

  const handleEditFarmer = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setIsDialogOpen(true);
  };
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <h1 className="text-2xl font-bold">Farmers Management</h1>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search farmers..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setSelectedFarmer(undefined);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-agri-primary hover:bg-agri-secondary">
                    <Plus className="mr-2 h-4 w-4" /> Add Farmer
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <FarmerForm 
                    onSubmit={handleAddFarmer} 
                    onCancel={() => {
                      setIsDialogOpen(false);
                      setSelectedFarmer(undefined);
                    }}
                    editFarmer={selectedFarmer}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {filteredFarmers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              {searchTerm ? (
                <>
                  <h3 className="text-lg font-medium mb-1">No farmers found</h3>
                  <p className="text-muted-foreground text-center">
                    No farmers match your search criteria. Try with a different name or phone number.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-1">No farmers added yet</h3>
                  <p className="text-muted-foreground text-center">
                    Get started by adding your first farmer using the "Add Farmer" button.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFarmers.map((farmer) => (
                <Card key={farmer.id} className="overflow-hidden">
                  <CardHeader className="bg-muted pb-2">
                    <CardTitle className="text-lg flex justify-between items-start">
                      <span>{farmer.name}</span>
                      <span className="text-xs bg-agri-primary text-white px-2 py-1 rounded-full">
                        ID: {farmer.id}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Phone:</span>
                        <span>{farmer.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Bank:</span>
                        <span className="truncate max-w-[200px]">{farmer.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Account:</span>
                        <span>{farmer.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Products:</span>
                        <span>{farmer.products?.length || 0}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          className="flex-1 bg-agri-primary hover:bg-agri-secondary" 
                          onClick={() => navigate(`/farmer/${farmer.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" /> View
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleEditFarmer(farmer)}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Farmers;
