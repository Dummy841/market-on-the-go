import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FaceCaptureModal from "@/components/FaceCaptureModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}

export const AdminChangePasswordModal = ({ open, onOpenChange, employeeId }: Props) => {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const handleCapture = async (descriptor: number[]) => {
    setSaving(true);
    const { error } = await supabase
      .from("admin_employees" as any)
      .update({ face_descriptor: descriptor as any, updated_at: new Date().toISOString() })
      .eq("id", employeeId);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to update face", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      toast({ title: "Face updated successfully" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDone(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Re-enroll Face ID</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Capture a new face image to update your Face ID login.
            </p>
            {done && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" /> Face updated successfully
              </div>
            )}
            <Button onClick={() => setCaptureOpen(true)} disabled={saving} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : done ? "Recapture" : "Capture New Face"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <FaceCaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onCapture={(desc) => handleCapture(desc)}
        title="Re-enroll Face"
        mode="enroll"
      />
    </>
  );
};
