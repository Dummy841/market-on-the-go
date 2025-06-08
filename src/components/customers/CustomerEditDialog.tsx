
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Customer } from '@/hooks/useCustomers';

interface CustomerEditDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

const CustomerEditDialog = ({ customer, open, onClose, onSave }: CustomerEditDialogProps) => {
  const [formData, setFormData] = useState({
    name: customer.name,
    email: customer.email || '',
    mobile: customer.mobile,
    address: customer.address || '',
    pincode: customer.pincode || '',
  });

  // Reset form data when customer changes
  useEffect(() => {
    setFormData({
      name: customer.name,
      email: customer.email || '',
      mobile: customer.mobile,
      address: customer.address || '',
      pincode: customer.pincode || '',
    });
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...customer,
      ...formData,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <Input
              id="mobile"
              value={formData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              value={formData.pincode}
              onChange={(e) => handleChange('pincode', e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerEditDialog;
