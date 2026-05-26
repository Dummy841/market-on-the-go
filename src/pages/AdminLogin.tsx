import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanFace } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import zippyLogo from "@/assets/zippy-logo.png";
import FaceCaptureModal from "@/components/FaceCaptureModal";

const AdminLogin = () => {
  const [mobile, setMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const startFaceLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast({ title: "Invalid mobile number", description: "Enter a valid 10-digit Indian mobile number", variant: "destructive" });
      return;
    }
    setFaceOpen(true);
  };

  const handleFaceCaptured = async (descriptor: number[]) => {
    setIsLoading(true);
    const result = await login(mobile, descriptor);
    setIsLoading(false);

    if (result.success) {
      toast({ title: "Welcome back!" });
      navigate("/dashboard", { replace: true });
    } else {
      toast({ title: "Login Failed", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <img src={zippyLogo} alt="Zippy" className="h-16 w-auto mx-auto" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to access the admin panel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={startFaceLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              <ScanFace className="h-4 w-4 mr-2" />
              {isLoading ? "Verifying..." : "Login with Face ID"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll be prompted to scan your face after entering your mobile number.
            </p>
          </form>
        </CardContent>
      </Card>
      <FaceCaptureModal
        open={faceOpen}
        onClose={() => setFaceOpen(false)}
        onCapture={(desc) => handleFaceCaptured(desc)}
        title="Face ID Login"
        mode="verify"
      />
    </div>
  );
};

export default AdminLogin;
