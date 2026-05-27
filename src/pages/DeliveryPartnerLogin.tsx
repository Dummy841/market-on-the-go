import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ScanFace } from "lucide-react";
import { useNavigate } from "react-router-dom";
import zippyLogo from "@/assets/zippy-logo.png";
import FaceCaptureModal, { faceDistance } from "@/components/FaceCaptureModal";

interface LoginFormData {
  mobile: string;
}

const DeliveryPartnerLogin = () => {
  const [loading, setLoading] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const [mobileForLogin, setMobileForLogin] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = (data: LoginFormData) => {
    setMobileForLogin(data.mobile);
    setFaceOpen(true);
  };

  const handleFaceCapture = async (descriptor: number[]) => {
    try {
      setLoading(true);
      const { data: partner, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('mobile', mobileForLogin)
        .maybeSingle();
      if (error || !partner) {
        toast({ title: "Login Failed", description: "No partner found with this mobile number", variant: "destructive" });
        return;
      }
      if (!partner.is_active) {
        toast({ title: "Account Inactive", description: "Please contact admin to activate your account", variant: "destructive" });
        return;
      }
      const stored = partner.face_descriptor as unknown as number[] | null;
      if (!stored || !Array.isArray(stored) || stored.length === 0) {
        toast({ title: "Face Not Enrolled", description: "Contact admin to enroll your face", variant: "destructive" });
        return;
      }
      const distance = faceDistance(stored, descriptor);
      if (distance > 0.55) {
        toast({ title: "Authentication Failed", description: "Face did not match. Please try again.", variant: "destructive" });
        return;
      }
      localStorage.setItem('delivery_partner', JSON.stringify(partner));
      toast({ title: "Login Successful", description: "Welcome to delivery partner dashboard" });
      navigate('/delivery-dashboard');
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-3">
            <img src={zippyLogo} alt="Zippy" className="h-20 w-auto object-contain" />
          </div>
          <CardTitle>Delivery Partner Login</CardTitle>
          <CardDescription>Enter your registered mobile number and verify with Face ID</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" {...register("mobile", { required: "Mobile number is required", pattern: { value: /^[0-9]{10}$/, message: "Please enter a valid 10-digit mobile number" } })} placeholder="Enter your mobile number" maxLength={10} />
              {errors.mobile && <p className="text-sm text-destructive">{errors.mobile.message}</p>}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : <><ScanFace className="mr-2 h-4 w-4" /> Login with Face ID</>}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Live face check with blink detection — photos are not allowed.</p>
          </form>
        </CardContent>
      </Card>
      <FaceCaptureModal
        open={faceOpen}
        onClose={() => setFaceOpen(false)}
        onCapture={(d) => { setFaceOpen(false); handleFaceCapture(d); }}
        title="Face ID Verification"
        mode="verify"
        requireLiveness={true}
      />
    </div>
  );
};

export default DeliveryPartnerLogin;
