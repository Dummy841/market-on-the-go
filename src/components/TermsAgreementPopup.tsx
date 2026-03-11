import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Loader2, AArrowUp, AArrowDown } from "lucide-react";

interface TermItem {
  id: string;
  content: string;
  display_order: number;
  updated_at: string;
}

const renderContent = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

const TermsAgreementPopup = () => {
  const { user, isAuthenticated } = useUserAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const checkTerms = async () => {
      const { data: termsData } = await supabase
        .from("terms_conditions")
        .select("id, content, display_order, updated_at")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!termsData || termsData.length === 0) return;

      const { data: userData } = await supabase
        .from("users")
        .select("terms_agreed_at")
        .eq("id", user.id)
        .single();

      const agreedAt = userData?.terms_agreed_at;

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

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setScrolledToEnd(true);
  };

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
    <Dialog open={showPopup} onOpenChange={() => {}}>
      <DialogContent
        className="!max-w-full !w-full !h-full !max-h-full !rounded-none m-0 p-0 flex flex-col z-[10002] [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-5 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl text-center font-bold">Terms & Conditions</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-muted-foreground">
              Please read all terms carefully to continue.
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFontSize(Math.max(12, fontSize - 1))}
              >
                <AArrowDown className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-6 text-center">{fontSize}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFontSize(Math.min(22, fontSize + 1))}
              >
                <AArrowUp className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          <div className="space-y-6">
            {terms.map((term, idx) => (
              <div key={term.id} className="flex gap-4">
                <span
                  className="font-bold text-primary min-w-[28px] flex-shrink-0"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {idx + 1}.
                </span>
                <p
                  className="text-foreground leading-relaxed"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                >
                  {renderContent(term.content)}
                </p>
              </div>
            ))}
          </div>

          {/* I Agree button at the end of content */}
          <div className="mt-8 pb-4">
            <Button
              onClick={handleAgree}
              disabled={loading}
              className="w-full h-12 text-base font-semibold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              I Agree
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAgreementPopup;
