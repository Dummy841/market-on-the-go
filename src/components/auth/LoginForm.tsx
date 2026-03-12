import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import zippyLogo from "@/assets/zippy-logo.png";

interface LoginFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  onRegisterRequired?: (mobile: string) => void;
}

interface ContentItem {
  id: string;
  content: string;
  display_order: number;
}

const renderContentText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

export const LoginForm = ({ isOpen, onClose, onSuccess, onRegisterRequired }: LoginFormProps) => {
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [mobile, setMobile] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");
  const [reusedMessage, setReusedMessage] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [terms, setTerms] = useState<ContentItem[]>([]);
  const [privacyPolicies, setPrivacyPolicies] = useState<ContentItem[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false);
  const [privacyScrolledToEnd, setPrivacyScrolledToEnd] = useState(false);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isVerifyingRef = useRef(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);
  const privacyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      const [termsRes, privacyRes] = await Promise.all([
        supabase.from("terms_conditions").select("id, content, display_order").eq("is_active", true).order("display_order", { ascending: true }),
        supabase.from("privacy_policy").select("id, content, display_order").eq("is_active", true).order("display_order", { ascending: true }),
      ]);
      if (termsRes.data) setTerms(termsRes.data);
      if (privacyRes.data) setPrivacyPolicies(privacyRes.data);
    };
    fetchData();
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (step === 'verify' && 'OTPCredential' in window) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      navigator.credentials.get({
        // @ts-ignore
        otp: { transport: ['sms'] },
        signal
      }).then((otpCredential: any) => {
        if (otpCredential && otpCredential.code) {
          const code = otpCredential.code.slice(0, 4);
          setOtp(code);
          toast({ title: "OTP Auto-filled", description: "OTP was automatically read from SMS" });
        }
      }).catch((err: any) => {
        if (err.name !== 'AbortError') console.log('OTP auto-read not available:', err.message);
      });
    }
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [step, toast]);

  useEffect(() => {
    if (otp.length === 4 && step === 'verify' && !isLoading && !isVerifyingRef.current) {
      isVerifyingRef.current = true;
      handleVerifyOtp();
    }
  }, [otp, step, isLoading]);

  const hasLegalContent = terms.length > 0 || privacyPolicies.length > 0;

  const handleSendOtp = async () => {
    setError("");
    if (!mobile.trim()) { setError("Please enter your mobile number"); return; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError("Invalid mobile number. Must start with 6, 7, 8, or 9"); return; }
    if (hasLegalContent && !agreedToTerms) { setError("Please agree to Terms & Conditions and Privacy Policy"); return; }
    setIsLoading(true);
    try {
      const { data: existingUser, error: userCheckError } = await supabase.from('users').select('id').eq('mobile', mobile).maybeSingle();
      if (userCheckError) throw new Error('Network error. Please check your connection and try again.');
      if (!existingUser) {
        setIsLoading(false);
        toast({ title: "User not found", description: "This mobile number is not registered. Please register first.", variant: "destructive" });
        setTimeout(() => { onClose(); onRegisterRequired?.(mobile); }, 100);
        return;
      }
      const { data, error } = await supabase.functions.invoke('send-2factor-otp', { body: { mobile, action: 'login' } });
      if (error) throw error;
      if (data.success) {
        setSessionId(data.sessionId);
        if (data.reused) {
          setReusedMessage("Your recent OTP is still valid. Please use it.");
          setStep('verify'); setResendTimer(180); setOtp(""); isVerifyingRef.current = false;
        } else {
          setReusedMessage("");
          toast({ title: "OTP Sent", description: "Please enter the 4-digit OTP sent to your mobile" });
          setStep('verify'); setResendTimer(30); setOtp(""); isVerifyingRef.current = false;
        }
      } else throw new Error(data.error || 'Failed to send OTP');
    } catch (error: any) {
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!otp.trim()) { setError("Please enter the OTP"); isVerifyingRef.current = false; return; }
    if (otp.length !== 4) { setError("Please enter a valid 4-digit OTP"); isVerifyingRef.current = false; return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2factor-otp', { body: { sessionId, otp } });
      if (error) throw error;
      if (!data.success) { setError(data.error || "Invalid OTP"); setIsLoading(false); isVerifyingRef.current = false; return; }
      
      if (hasLegalContent && agreedToTerms) {
        await supabase.from('users').update({ terms_agreed_at: new Date().toISOString() }).eq('mobile', mobile);
      }
      
      const { data: user, error: userError } = await supabase.from('users').select('*').eq('mobile', mobile).single();
      if (userError) throw userError;
      toast({ title: "Success", description: "Login successful!" });
      onSuccess(user); onClose(); resetForm();
    } catch (error: any) {
      setError(error.message || "Login failed. Please try again."); isVerifyingRef.current = false;
    } finally { setIsLoading(false); }
  };

  const handleResendOtp = async () => {
    setError(""); setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-2factor-otp', { body: { mobile, action: 'login' } });
      if (error) throw error;
      if (data.success) { setSessionId(data.sessionId); toast({ title: "OTP Sent", description: "New OTP sent to your mobile" }); setResendTimer(30); setOtp(""); isVerifyingRef.current = false; }
      else throw new Error(data.error || 'Failed to resend OTP');
    } catch (error: any) { setError(error.message || "Failed to resend OTP"); }
    finally { setIsLoading(false); }
  };

  const resetForm = () => { setStep('login'); setMobile(""); setSessionId(""); setOtp(""); setResendTimer(0); setError(""); setReusedMessage(""); setAgreedToTerms(false); setShowTerms(false); setShowPrivacy(false); isVerifyingRef.current = false; };
  const handleClose = () => { resetForm(); onClose(); };
  const handleOtpChange = (value: string) => { setOtp(value.replace(/\D/g, '').slice(0, 4)); setError(""); };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md z-[10000] rounded-2xl">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 mb-2">
              <img src={zippyLogo} alt="Zippy" className="h-16 w-auto object-contain" />
              <DialogTitle>{step === 'login' ? 'Login' : 'Verify OTP'}</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {step === 'login' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <div className="flex">
                    <div className="flex items-center justify-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">+91</div>
                    <Input id="mobile" type="tel" placeholder="Enter your mobile number" value={mobile} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, '')); setError(""); }} maxLength={10} className="rounded-l-none" />
                  </div>
                </div>

                {hasLegalContent && (
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="login-terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => {
                        setAgreedToTerms(!!checked);
                      }}
                      className="mt-0.5"
                    />
                    <label htmlFor="login-terms" className="text-sm leading-tight cursor-pointer">
                      I agree to the{" "}
                      {terms.length > 0 && (
                        <button type="button" onClick={() => { setTermsScrolledToEnd(false); setShowTerms(true); }} className="text-primary underline font-medium">
                          Terms & Conditions
                        </button>
                      )}
                      {terms.length > 0 && privacyPolicies.length > 0 && " and "}
                      {privacyPolicies.length > 0 && (
                        <button type="button" onClick={() => { setPrivacyScrolledToEnd(false); setShowPrivacy(true); }} className="text-primary underline font-medium">
                          Privacy Policy
                        </button>
                      )}
                    </label>
                  </div>
                )}

                {error && <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /><p className="text-sm font-medium">{error}</p></div>}
                <Button onClick={handleSendOtp} disabled={isLoading || (hasLegalContent && !agreedToTerms)} className="w-full">
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending OTP...</> : "Send OTP"}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">OTP sent to <span className="font-medium text-foreground">+91 {mobile}</span></p>
                  {reusedMessage && <p className="text-sm text-orange-600 font-medium mt-2">{reusedMessage}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter 4-digit OTP" value={otp} onChange={(e) => handleOtpChange(e.target.value)} maxLength={4} className="text-center text-2xl font-bold tracking-[0.5em] h-14 border-2 border-primary/30 focus:border-primary" autoFocus />
                  {error && <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg"><AlertCircle className="h-5 w-5 text-destructive" /><p className="text-sm font-semibold text-destructive">{error}</p></div>}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => { setStep('login'); setError(""); setOtp(""); isVerifyingRef.current = false; }} className="flex-1">Back</Button>
                  <Button onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 4} className="flex-1">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Verify OTP"}
                  </Button>
                </div>
                <div className="text-center">
                  <Button variant="link" onClick={handleResendOtp} disabled={resendTimer > 0 || isLoading} className="text-sm">
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions Dialog - Fullscreen */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="!max-w-full !w-full !h-full !max-h-full !rounded-none m-0 p-0 flex flex-col z-[10001]">
          <div className="flex-shrink-0 p-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-xl text-center font-bold">Terms & Conditions</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground text-center mt-2">Please read all terms carefully</p>
          </div>
          <div
            ref={termsScrollRef}
            onScroll={() => {
              const el = termsScrollRef.current;
              if (!el) return;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setTermsScrolledToEnd(true);
            }}
            className="flex-1 overflow-y-auto px-5 py-4"
          >
            <div className="space-y-6">
              {terms.map((term, idx) => (
                <div key={term.id} className="flex gap-4">
                  <span className="font-bold text-primary min-w-[28px] flex-shrink-0">{idx + 1}.</span>
                  <p className="text-foreground leading-relaxed" style={{ lineHeight: 1.8 }}>{renderContentText(term.content)}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 pb-4">
              {termsScrolledToEnd ? (
                <Button onClick={() => setShowTerms(false)} className="w-full h-12 text-base font-semibold">
                  Close
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground animate-pulse">↓ Scroll down to read all terms ↓</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog - Fullscreen */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="!max-w-full !w-full !h-full !max-h-full !rounded-none m-0 p-0 flex flex-col z-[10001]">
          <div className="flex-shrink-0 p-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-xl text-center font-bold">Privacy Policy</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground text-center mt-2">Please read our privacy policy carefully</p>
          </div>
          <div
            ref={privacyScrollRef}
            onScroll={() => {
              const el = privacyScrollRef.current;
              if (!el) return;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setPrivacyScrolledToEnd(true);
            }}
            className="flex-1 overflow-y-auto px-5 py-4"
          >
            <div className="space-y-6">
              {privacyPolicies.map((item, idx) => (
                <div key={item.id} className="flex gap-4">
                  <span className="font-bold text-primary min-w-[28px] flex-shrink-0">{idx + 1}.</span>
                  <p className="text-foreground leading-relaxed" style={{ lineHeight: 1.8 }}>{renderContentText(item.content)}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 pb-4">
              {privacyScrolledToEnd ? (
                <Button onClick={() => setShowPrivacy(false)} className="w-full h-12 text-base font-semibold">
                  Close
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground animate-pulse">↓ Scroll down to read all points ↓</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
