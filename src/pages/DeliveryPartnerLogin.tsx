import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LoginFormData {
  mobile: string;
  password: string;
}

const DeliveryPartnerLogin = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const login = async (data: LoginFormData) => {
    try {
      setLoading(true);
      
      // Check if delivery partner exists and get password hash
      const { data: partner, error: partnerError } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('mobile', data.mobile)
        .single();

      if (partnerError || !partner) {
        toast({
          title: "Login Failed",
          description: "Invalid mobile number or password",
          variant: "destructive",
        });
        return;
      }

      if (!partner.password_hash) {
        toast({
          title: "Account Setup Required",
          description: "Please contact admin to set up your password",
          variant: "destructive",
        });
        return;
      }

      // Verify password
      const { data: isValidPassword, error: verifyError } = await supabase.rpc('verify_password', {
        password: data.password,
        hash: partner.password_hash as any
      });

      if (verifyError || !isValidPassword) {
        toast({
          title: "Login Failed",
          description: "Invalid mobile number or password",
          variant: "destructive",
        });
        return;
      }

      // Store partner info in localStorage (in a real app, use proper session management)
      localStorage.setItem('delivery_partner', JSON.stringify(partner));

      toast({
        title: "Login Successful",
        description: "Welcome to delivery partner dashboard",
      });

      navigate('/delivery-dashboard');
    } catch (error) {
      console.error('Error during login:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Delivery Partner Login</CardTitle>
          <CardDescription>
            Enter your registered mobile number and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(login)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                {...register("mobile", { 
                  required: "Mobile number is required",
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: "Please enter a valid 10-digit mobile number"
                  }
                })}
                placeholder="Enter your mobile number"
                maxLength={10}
              />
              {errors.mobile && (
                <p className="text-sm text-destructive">{errors.mobile.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password", { 
                  required: "Password is required"
                })}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryPartnerLogin;