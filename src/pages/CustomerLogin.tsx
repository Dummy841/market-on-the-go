
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCustomers } from '@/hooks/useCustomers';

const CustomerLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginCustomer } = useCustomers();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSendOtp = async () => {
    if (!mobile || mobile.length < 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check if customer exists in Supabase
      const result = await loginCustomer(mobile);
      
      if (!result.success) {
        toast({
          title: "Account Not Found",
          description: "No account found with this mobile number",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Simulate OTP sending
      setTimeout(() => {
        setIsLoading(false);
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: "An OTP has been sent to your mobile number"
        });
      }, 1500);
      
    } catch (error) {
      console.error('Error checking customer:', error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length < 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid OTP",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate OTP verification and get customer data
      const result = await loginCustomer(mobile);
      
      if (result.success && result.customer) {
        // Store logged in customer info
        localStorage.setItem('currentCustomer', JSON.stringify(result.customer));
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.customer.name}!`
        });
        
        navigate('/customer-home');
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
              <span className="text-lg font-bold">DostanFarms</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Customer Login</CardTitle>
          <CardDescription className="text-center">Log in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <div className="flex gap-2">
                <Input
                  id="mobile"
                  placeholder="Your mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={otpSent || isLoading}
                  required
                />
                {!otpSent && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send OTP"}
                  </Button>
                )}
              </div>
            </div>
            
            {otpSent && (
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            )}
            
            {otpSent && (
              <Button 
                type="submit" 
                className="w-full bg-agri-primary hover:bg-agri-secondary"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            )}
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/customer-register" className="text-primary hover:underline">
                  Register
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerLogin;
