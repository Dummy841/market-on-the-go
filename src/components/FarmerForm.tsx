import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Farmer } from '@/utils/types';
import { mockFarmers } from '@/utils/mockData';
import { Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { states, districts, villages, banks } from '@/utils/locationData';
import PhotoUploadField from '@/components/PhotoUploadField';

interface FarmerFormProps {
  onSubmit: (farmer: Farmer) => void;
  onCancel: () => void;
  editFarmer?: Farmer; // New prop to support editing
}

const FarmerForm: React.FC<FarmerFormProps> = ({ onSubmit, onCancel, editFarmer }) => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
    email: '',
    password: '',
    profile_photo: '',
    state: '',
    district: '',
    village: ''
  });
  
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableVillages, setAvailableVillages] = useState<string[]>([]);
  const [statesList] = useState<string[]>(Object.keys(states));

  // Populate form when editing an existing farmer
  useEffect(() => {
    if (editFarmer) {
      setFormData({
        name: editFarmer.name,
        phone: editFarmer.phone,
        address: editFarmer.address || '',
        account_number: editFarmer.account_number || '',
        bank_name: editFarmer.bank_name || '',
        ifsc_code: editFarmer.ifsc_code || '',
        email: editFarmer.email,
        password: editFarmer.password,
        profile_photo: editFarmer.profile_photo || '',
        state: editFarmer.state || '',
        district: editFarmer.district || '',
        village: editFarmer.village || ''
      });
      
      // Set available districts and villages if state and district are available
      if (editFarmer.state && districts[editFarmer.state]) {
        setAvailableDistricts(districts[editFarmer.state]);
        
        if (editFarmer.district && villages[editFarmer.district]) {
          setAvailableVillages(villages[editFarmer.district]);
        }
      }
    }
  }, [editFarmer]);

  // Update districts when state changes
  useEffect(() => {
    if (formData.state && districts[formData.state]) {
      setAvailableDistricts(districts[formData.state]);
      if (!districts[formData.state].includes(formData.district)) {
        setFormData(prev => ({ ...prev, district: '', village: '' }));
        setAvailableVillages([]);
      }
    } else {
      setAvailableDistricts([]);
    }
  }, [formData.state]);

  // Update villages when district changes
  useEffect(() => {
    if (formData.district && villages[formData.district]) {
      setAvailableVillages(villages[formData.district]);
      if (!villages[formData.district].includes(formData.village)) {
        setFormData(prev => ({ ...prev, village: '' }));
      }
    } else {
      setAvailableVillages([]);
    }
  }, [formData.district]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Email validation function
  const validateEmail = (email: string) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  // Phone validation function (Indian mobile format)
  const validatePhone = (phone: string) => {
    const re = /^[6-9]\d{9}$/;
    return re.test(String(phone));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email and phone
    if (formData.email && !validateEmail(formData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.phone && !validatePhone(formData.phone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive"
      });
      return;
    }

    // Basic validation
    if (!formData.name || !formData.phone || !formData.account_number || !formData.bank_name || !formData.email || !formData.password || !formData.state) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Create new farmer or update existing one
    const updatedFarmer: Farmer = {
      id: editFarmer ? editFarmer.id : `${mockFarmers.length + 1}`,
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      account_number: formData.account_number,
      bank_name: formData.bank_name,
      ifsc_code: formData.ifsc_code,
      date_joined: editFarmer ? editFarmer.date_joined : new Date().toISOString(),
      products: editFarmer ? editFarmer.products : [],
      transactions: editFarmer ? editFarmer.transactions : [],
      email: formData.email,
      password: formData.password,
      profile_photo: formData.profile_photo,
      state: formData.state,
      district: formData.district,
      village: formData.village
    };

    onSubmit(updatedFarmer);
    toast({
      title: editFarmer ? "Farmer updated" : "Farmer created",
      description: editFarmer ? "Farmer has been successfully updated." : "New farmer has been successfully added."
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{editFarmer ? "Edit Farmer" : "Add New Farmer"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <ScrollArea className="h-[65vh]">
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <PhotoUploadField
                value={formData.profile_photo}
                onChange={(value) => setFormData(prev => ({ ...prev, profile_photo: value }))}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Farmer Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Enter farmer name" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  placeholder="Enter phone number" 
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className={formData.phone && !validatePhone(formData.phone) ? "border-red-500" : ""}
                />
                {formData.phone && !validatePhone(formData.phone) && 
                  <p className="text-xs text-red-500">Please enter a valid 10-digit mobile number</p>
                }
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email"
                  placeholder="Enter email address" 
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={formData.email && !validateEmail(formData.email) ? "border-red-500" : ""}
                />
                {formData.email && !validateEmail(formData.email) && 
                  <p className="text-xs text-red-500">Please enter a valid email address</p>
                }
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password" 
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
              </div>

              {/* Location fields */}
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select 
                  value={formData.state} 
                  onValueChange={(value) => handleSelectChange("state", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {statesList.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Select 
                  value={formData.district} 
                  onValueChange={(value) => handleSelectChange("district", value)}
                  disabled={!formData.state || availableDistricts.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableDistricts.map(district => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="village">Village</Label>
                <Select 
                  value={formData.village} 
                  onValueChange={(value) => handleSelectChange("village", value)}
                  disabled={!formData.district || availableVillages.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select village" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableVillages.map(village => (
                      <SelectItem key={village} value={village}>{village}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  name="address" 
                  placeholder="Enter address" 
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              {/* Banking Details */}
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input 
                  id="account_number" 
                  name="account_number" 
                  placeholder="Enter account number" 
                  value={formData.account_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Select 
                  value={formData.bank_name} 
                  onValueChange={(value) => handleSelectChange("bank_name", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {banks.map(bank => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input 
                  id="ifsc_code" 
                  name="ifsc_code" 
                  placeholder="Enter IFSC code" 
                  value={formData.ifsc_code}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </ScrollArea>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="bg-agri-primary hover:bg-agri-secondary">{editFarmer ? "Update Farmer" : "Save Farmer"}</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default FarmerForm;
