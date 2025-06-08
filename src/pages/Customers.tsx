import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Search, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CustomerEditDialog from '@/components/customers/CustomerEditDialog';
import CustomerOrdersDialog from '@/components/customers/CustomerOrdersDialog';
import Sidebar from '@/components/Sidebar';
import { useCustomers, Customer } from '@/hooks/useCustomers';

const Customers = () => {
  const { customers, loading, updateCustomer, deleteCustomer } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingOrders, setViewingOrders] = useState<Customer | null>(null);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.mobile.includes(searchTerm)
  );

  const handleDeleteCustomer = async (customerId: string) => {
    await deleteCustomer(customerId);
  };

  const handleEditCustomer = async (updatedCustomer: Customer) => {
    // Convert Customer to the format expected by updateCustomer
    const customerUpdate = {
      id: updatedCustomer.id,
      name: updatedCustomer.name,
      email: updatedCustomer.email,
      mobile: updatedCustomer.mobile,
      address: updatedCustomer.address,
      pincode: updatedCustomer.pincode
    };
    
    const result = await updateCustomer(updatedCustomer.id, customerUpdate);
    if (result.success) {
      setEditingCustomer(null);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="text-center py-12">
              <div className="text-muted-foreground text-lg">Loading customers...</div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Customer Management</h1>
            <Badge variant="secondary">
              {customers.length} Total Customers
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registered Customers</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground text-lg mb-2">
                    {searchTerm ? 'No customers found matching your search' : 'No customers registered yet'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search terms' : 'Customers who register through the customer portal will appear here'}
                  </div>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Date Registered</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.email || 'Not provided'}</TableCell>
                          <TableCell>{customer.mobile}</TableCell>
                          <TableCell className="max-w-xs truncate" title={customer.address}>
                            {customer.address || 'Not provided'}
                          </TableCell>
                          <TableCell>{new Date(customer.date_joined || new Date()).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingOrders(customer)}
                                title="View Orders"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCustomer(customer)}
                                title="Edit Customer"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteCustomer(customer.id)}
                                title="Delete Customer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit Customer Dialog */}
      {editingCustomer && (
        <CustomerEditDialog
          customer={editingCustomer}
          open={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={handleEditCustomer}
        />
      )}

      {/* View Orders Dialog */}
      {viewingOrders && (
        <CustomerOrdersDialog
          customer={viewingOrders}
          open={!!viewingOrders}
          onClose={() => setViewingOrders(null)}
        />
      )}
    </SidebarProvider>
  );
};

export default Customers;
