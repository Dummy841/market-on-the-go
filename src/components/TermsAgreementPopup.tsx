import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Loader2 } from "lucide-react";

interface TermItem {
  id: string;
  content: string;
  display_order: number;
  updated_at: string;
}

const TermsAgreementPopup = () => {
  const { user, isAuthenticated } = useUserAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkTerms = async () => {
      // Fetch active terms
      const { data: termsData } = await supabase
        .from("terms_conditions")
        .select("id, content, display_order, updated_at")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!termsData || termsData.length === 0) return;

      // Get user's terms_agreed_at
      const { data: userData } = await supabase
        .from("users")
        .select("terms_agreed_at")
        .eq("id", user.id)
        .single();

      const agreedAt = userData?.terms_agreed_at;

      // If user never agreed, or any term was updated after user agreed
      if (!agreedAt) {
        setTerms(termsData);
        setShowPopup(true);
        return;
      }

      const agreedDate = new Date(agreedAt);
      const hasNewOrUpdatedTerms = termsData.some(
        (term) => new Date(term.updated_at) > agreedDate
      );

      if (hasNewOrUpdatedTerms) {
        setTerms(termsData);
        setShowPopup(true);
      }
    };

    checkTerms();
  }, [isAuthenticated, user]);

  const handleAgree = async () => {
    if (!user) return;
    setLoading(true);
    await supabase
      .from("users")
      .update({ terms_agreed_at: new Date().toISOString() })
      .eq("id", user.id);
    setShowPopup(false);
    setLoading(false);
  };

  if (!showPopup) return null;

  return (
    <Dialog open={showPopup} onOpenChange={() => {/* prevent closing without agreeing */}}>
      <DialogContent
        className="sm:max-w-lg z-[10002] rounded-2xl max-h-[85vh] [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">Updated Terms & Conditions</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground text-center">
          Our terms have been updated. Please review and agree to continue using the app.
        </p>
        <ScrollArea className="max-h-[45vh] pr-4">
          <div className="space-y-3 py-2">
            {terms.map((term, idx) => (
              <div key={term.id} className="flex gap-3">
                <span className="text-sm font-semibold text-primary min-w-[24px]">{idx + 1}.</span>
                <p className="text-sm text-foreground leading-relaxed">{term.content}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button onClick={handleAgree} disabled={loading} className="w-full mt-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          I Agree
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAgreementPopup;
