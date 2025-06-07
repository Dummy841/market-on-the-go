
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { mockFarmers } from '@/utils/mockData';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import TicketDialog from '@/components/ticket/TicketDialog';
import { Ticket } from '@/utils/types';
import { v4 as uuidv4 } from 'uuid';

const FarmerLogin = () => {
  const [phone, setPhone] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validate phone number (10 digits, starts with 6-9)
  const validatePhone = (phone: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone(phone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number starting with 6-9",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    // Check if farmer exists with this phone number
    const farmerExists = mockFarmers.some(farmer => farmer.phone === phone);
    
    if (!farmerExists) {
      toast({
        title: "Account not found",
        description: "No farmer account exists with this phone number",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    // Generate a 6-digit OTP
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    
    // Simulate API delay for sending OTP
    setTimeout(() => {
      setIsOtpSent(true);
      setIsLoading(false);
      
      toast({
        title: "OTP sent",
        description: `A 6-digit OTP has been sent to ${phone}. For testing, use: ${randomOtp}`,
      });
    }, 1500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API delay for verifying OTP
    setTimeout(() => {
      if (otp === generatedOtp) {
        const farmer = mockFarmers.find(farmer => farmer.phone === phone);
        
        if (farmer) {
          // Store farmer login info
          localStorage.setItem('currentFarmer', JSON.stringify({
            id: farmer.id,
            name: farmer.name,
            isLoggedIn: true
          }));
          
          toast({
            title: "Login successful",
            description: `Welcome back, ${farmer.name}!`,
          });
          
          navigate(`/farmer-dashboard/${farmer.id}`);
        }
      } else {
        toast({
          title: "Invalid OTP",
          description: "The OTP you entered is incorrect. Please try again.",
          variant: "destructive"
        });
      }
      
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-6 w-6 text-agri-primary" />
            <span className="text-lg font-bold">DostanFarms</span>
          </div>
          <CardTitle className="text-2xl font-bold">Farmer Login</CardTitle>
        </CardHeader>
        <CardContent>
          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Your 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter your registered 10-digit mobile number
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-agri-primary hover:bg-agri-secondary"
                disabled={isLoading}
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to {phone}
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-agri-primary hover:bg-agri-secondary"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
              <div className="text-center">
                <Button 
                  variant="link" 
                  type="button" 
                  onClick={() => setIsOtpSent(false)}
                  className="text-sm p-0"
                >
                  Change phone number
                </Button>
              </div>
              <div className="text-center">
                <Button 
                  variant="link" 
                  type="button"
                  className="text-sm p-0"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                >
                  Resend OTP
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerLogin;
