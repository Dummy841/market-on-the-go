import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Coupon } from '@/utils/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

const Coupons = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  
  // Load coupons from localStorage on component mount
  useEffect(() => {
    const savedCoupons = localStorage.getItem('coupons');
    if (savedCoupons) {
      const parsedCoupons = JSON.parse(savedCoupons);
      // Convert date strings back to Date objects
      const couponsWithDates = parsedCoupons.map((coupon: any) => ({
        ...coupon,
        expiryDate: new Date(coupon.expiryDate)
      }));
      setCoupons(couponsWithDates);
    } else {
      // Set default coupons if none exist
      const defaultCoupons = [
        {
          code: 'SUMMER10',
          discountType: 'percentage' as const,
          discountValue: 10,
          maxDiscountLimit: 500,
          expiryDate: new Date(2025, 5, 30),
          targetType: 'all' as const
        },
        {
          code: 'WELCOME200',
          discountType: 'flat' as const,
          discountValue: 200,
          expiryDate: new Date(2025, 11, 31),
          targetType: 'all' as const
        }
      ];
      setCoupons(defaultCoupons);
      localStorage.setItem('coupons', JSON.stringify(defaultCoupons));
    }
  }, []);
  
  // Save coupons to localStorage whenever coupons change
  const saveCouponsToStorage = (updatedCoupons: Coupon[]) => {
    localStorage.setItem('coupons', JSON.stringify(updatedCoupons));
    setCoupons(updatedCoupons);
  };
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [maxDiscountLimit, setMaxDiscountLimit] = useState<number | undefined>(undefined);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [targetType, setTargetType] = useState<'all' | 'customer' | 'employee'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  
  const resetForm = () => {
    setCouponCode('');
    setDiscountType('percentage');
    setDiscountValue(0);
    setMaxDiscountLimit(undefined);
    setExpiryDate(undefined);
    setTargetType('all');
    setTargetUserId('');
    setIsEditMode(false);
    setEditIndex(null);
  };
  
  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };
  
  const openEditDialog = (index: number) => {
    const coupon = coupons[index];
    setCouponCode(coupon.code);
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue);
    setMaxDiscountLimit(coupon.maxDiscountLimit);
    setExpiryDate(coupon.expiryDate);
    setTargetType(coupon.targetType || 'all');
    setTargetUserId(coupon.targetUserId || '');
    setIsEditMode(true);
    setEditIndex(index);
    setIsDialogOpen(true);
  };
  
  const handleDelete = (index: number) => {
    const updatedCoupons = [...coupons];
    updatedCoupons.splice(index, 1);
    saveCouponsToStorage(updatedCoupons);
    
    toast({
      title: "Coupon deleted",
      description: "The coupon has been successfully removed.",
    });
  };
  
  const validateForm = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Missing coupon code",
        description: "Please enter a coupon code.",
        variant: "destructive"
      });
      return false;
    }
    
    if (discountValue <= 0) {
      toast({
        title: "Invalid discount value",
        description: "Discount value must be greater than zero.",
        variant: "destructive"
      });
      return false;
    }
    
    if (discountType === 'percentage' && discountValue > 100) {
      toast({
        title: "Invalid percentage",
        description: "Percentage discount cannot exceed 100%.",
        variant: "destructive"
      });
      return false;
    }
    
    if (!expiryDate) {
      toast({
        title: "Missing expiry date",
        description: "Please select an expiry date.",
        variant: "destructive"
      });
      return false;
    }
    
    if ((targetType === 'customer' || targetType === 'employee') && !targetUserId.trim()) {
      toast({
        title: "Missing target user",
        description: "Please enter a target user ID for user-specific coupons.",
        variant: "destructive"
      });
      return false;
    }
    
    // Check if coupon code already exists (when adding new coupon)
    if (!isEditMode && coupons.some(c => c.code.toLowerCase() === couponCode.toLowerCase())) {
      toast({
        title: "Duplicate coupon code",
        description: "This coupon code already exists. Please use a different code.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };
  
  const handleSave = () => {
    if (!validateForm()) return;
    
    const couponData: Coupon = {
      code: couponCode,
      discountType,
      discountValue,
      maxDiscountLimit: discountType === 'percentage' ? maxDiscountLimit : undefined,
      expiryDate: expiryDate!,
      targetType,
      targetUserId: (targetType === 'customer' || targetType === 'employee') ? targetUserId : undefined
    };
    
    if (isEditMode && editIndex !== null) {
      // Update existing coupon
      const updatedCoupons = [...coupons];
      updatedCoupons[editIndex] = couponData;
      saveCouponsToStorage(updatedCoupons);
      
      toast({
        title: "Coupon updated",
        description: "The coupon has been successfully updated.",
      });
    } else {
      // Add new coupon
      const updatedCoupons = [...coupons, couponData];
      saveCouponsToStorage(updatedCoupons);
      
      toast({
        title: "Coupon created",
        description: "New coupon has been successfully created.",
      });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const getTargetTypeLabel = (coupon: Coupon) => {
    switch (coupon.targetType) {
      case 'customer':
        return `Customer: ${coupon.targetUserId}`;
      case 'employee':
        return `Employee: ${coupon.targetUserId}`;
      default:
        return 'All Users';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Coupon Management</h1>
            <Button onClick={openAddDialog} className="bg-agri-primary hover:bg-agri-secondary">
              <Plus className="h-4 w-4 mr-2" /> Create Coupon
            </Button>
          </div>
          
          {coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 bg-muted rounded-lg">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No coupons available</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create coupons to offer discounts to your customers.
              </p>
              <Button onClick={openAddDialog} className="bg-agri-primary hover:bg-agri-secondary">
                <Plus className="h-4 w-4 mr-2" /> Create First Coupon
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coupon Code</TableHead>
                    <TableHead>Discount Type</TableHead>
                    <TableHead>Discount Value</TableHead>
                    <TableHead>Max Limit</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{coupon.code}</TableCell>
                      <TableCell className="capitalize">
                        {coupon.discountType}
                      </TableCell>
                      <TableCell>
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}%`
                          : `₹${coupon.discountValue}`}
                      </TableCell>
                      <TableCell>
                        {coupon.maxDiscountLimit ? `₹${coupon.maxDiscountLimit}` : '-'}
                      </TableCell>
                      <TableCell>
                        {getTargetTypeLabel(coupon)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(coupon.expiryDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {new Date(coupon.expiryDate) > new Date() ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Expired
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(index)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(index)}
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
                <DialogDescription>
                  {isEditMode 
                    ? 'Update the coupon details below.'
                    : 'Fill in the coupon details to create a new discount coupon.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="couponCode" className="text-right">
                    Coupon Code
                  </Label>
                  <Input
                    id="couponCode"
                    placeholder="e.g., SUMMER10"
                    className="col-span-3"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discountType" className="text-right">
                    Discount Type
                  </Label>
                  <Select
                    value={discountType}
                    onValueChange={(value: any) => setDiscountType(value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discountValue" className="text-right">
                    Discount Value
                  </Label>
                  <div className="col-span-3 flex items-center">
                    <Input
                      id="discountValue"
                      type="number"
                      min="0"
                      placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 500'}
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                    />
                    <span className="ml-2">{discountType === 'percentage' ? '%' : '₹'}</span>
                  </div>
                </div>
                
                {discountType === 'percentage' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="maxDiscountLimit" className="text-right">
                      Max Discount Limit
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Input
                        id="maxDiscountLimit"
                        type="number"
                        min="0"
                        placeholder="e.g., 1000"
                        value={maxDiscountLimit || ''}
                        onChange={(e) => setMaxDiscountLimit(Number(e.target.value) || undefined)}
                      />
                      <span className="ml-2">₹</span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="targetType" className="text-right">
                    Target Type
                  </Label>
                  <Select
                    value={targetType}
                    onValueChange={(value: any) => setTargetType(value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select target type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="customer">Specific Customer</SelectItem>
                      <SelectItem value="employee">Specific Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(targetType === 'customer' || targetType === 'employee') && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="targetUserId" className="text-right">
                      {targetType === 'customer' ? 'Customer ID' : 'Employee ID'}
                    </Label>
                    <Input
                      id="targetUserId"
                      placeholder={`Enter ${targetType} ID`}
                      className="col-span-3"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expiryDate" className="text-right">
                    Expiry Date
                  </Label>
                  <div className="col-span-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="expiryDate"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !expiryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={expiryDate}
                          onSelect={setExpiryDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-agri-primary hover:bg-agri-secondary">
                  {isEditMode ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Coupons;
