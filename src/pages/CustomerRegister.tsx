
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/utils/types';

const CustomerRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    mobile: '',
    email: ''
  });
  
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSendOtp = () => {
    if (!customer.mobile || customer.mobile.length < 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate OTP sending
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: "An OTP has been sent to your mobile number"
      });
    }, 1500);
  };
  
  const handleVerifyOtp = () => {
    if (!otp || otp.length < 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid OTP",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate OTP verification
    setTimeout(() => {
      setIsLoading(false);
      setOtpVerified(true);
      toast({
        title: "OTP Verified",
        description: "Your mobile number has been verified"
      });
    }, 1500);
  };
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer.name || !address || !pincode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    if (!otpVerified) {
      toast({
        title: "Mobile Not Verified",
        description: "Please verify your mobile number",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate registration process
    setTimeout(() => {
      // Save customer data to localStorage for demo purposes
      const customers = JSON.parse(localStorage.getItem('customers') || '[]');
      const newCustomer = {
        ...customer,
        id: `cust_${Date.now()}`,
        address,
        pincode,
        dateJoined: new Date().toISOString()
      };
      
      customers.push(newCustomer);
      localStorage.setItem('customers', JSON.stringify(customers));
      
      setIsLoading(false);
      toast({
        title: "Registration Successful",
        description: "Your account has been created successfully"
      });
      
      navigate('/customer-login');
    }, 1500);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-4 top-4" 
              onClick={() => navigate('/app-landing')}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div className="mx-auto flex items-center gap-2">
              <Package className="h-6 w-6 text-agri-primary" />
              <span className="text-lg font-bold">AgriPay</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Customer Registration</CardTitle>
          <CardDescription className="text-center">Create your account to start shopping</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Your full name"
                value={customer.name}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <div className="flex gap-2">
                <Input
                  id="mobile"
                  name="mobile"
                  placeholder="Your mobile number"
                  value={customer.mobile}
                  onChange={handleInputChange}
                  disabled={otpSent || isLoading}
                  required
                />
                {!otpVerified && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={otpSent || isLoading}
                  >
                    {otpSent ? "Resend" : "Send OTP"}
                  </Button>
                )}
              </div>
            </div>
            
            {otpSent && !otpVerified && (
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Verification</Label>
                <div className="flex gap-2">
                  <Input
                    id="otp"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleVerifyOtp}
                    disabled={isLoading}
                  >
                    Verify
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Your email address"
                value={customer.email || ''}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Your full address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                placeholder="Delivery area pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-agri-primary hover:bg-agri-secondary"
              disabled={isLoading || !otpVerified}
            >
              {isLoading ? "Registering..." : "Register"}
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/customer-login" className="text-primary hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerRegister;
