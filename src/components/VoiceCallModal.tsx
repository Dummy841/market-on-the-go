import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming } from "lucide-react";
import { useEffect, useState } from "react";

interface VoiceCallModalProps {
  open: boolean;
  status: 'idle' | 'calling' | 'ringing' | 'ongoing' | 'ended' | 'declined' | 'missed';
  partnerName: string;
  partnerAvatar?: string | null;
  duration: number;
  isMuted: boolean;
  isIncoming: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onClose: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const VoiceCallModal = ({
  open,
  status,
  partnerName,
  partnerAvatar,
  duration,
  isMuted,
  isIncoming,
  onAnswer,
  onDecline,
  onEnd,
  onToggleMute,
  onClose,
}: VoiceCallModalProps) => {
  const [pulseAnimation, setPulseAnimation] = useState(true);

  useEffect(() => {
    if (status === 'ringing' || status === 'calling') {
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const getStatusText = () => {
    switch (status) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Incoming Call';
      case 'ongoing':
        return formatDuration(duration);
      case 'ended':
        return 'Call Ended';
      case 'declined':
        return 'Call Declined';
      case 'missed':
        return 'No Answer';
      default:
        return '';
    }
  };

  if (!open || status === 'idle') return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-sm bg-gradient-to-b from-slate-900 to-slate-800 border-0 text-white"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center py-8 space-y-6">
          {/* Avatar with pulse animation */}
          <div className="relative">
            <div 
              className={`absolute inset-0 rounded-full bg-primary/30 ${
                (status === 'ringing' || status === 'calling') && pulseAnimation 
                  ? 'animate-ping' 
                  : ''
              }`}
              style={{ transform: 'scale(1.2)' }}
            />
            <Avatar className="h-24 w-24 border-4 border-primary/50">
              <AvatarImage src={partnerAvatar || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                {partnerName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name and Status */}
          <div className="text-center">
            <h2 className="text-xl font-semibold">{partnerName}</h2>
            <p className="text-slate-400 mt-1">{getStatusText()}</p>
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-6 pt-4">
            {/* Incoming call - Answer and Decline */}
            {status === 'ringing' && isIncoming && (
              <>
                <Button
                  variant="destructive"
                  size="lg"
                  className="h-16 w-16 rounded-full"
                  onClick={onDecline}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700"
                  onClick={onAnswer}
                >
                  <PhoneIncoming className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Outgoing call - Cancel */}
            {status === 'calling' && (
              <Button
                variant="destructive"
                size="lg"
                className="h-16 w-16 rounded-full"
                onClick={onEnd}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            )}

            {/* Ongoing call - Mute and End */}
            {status === 'ongoing' && (
              <>
                <Button
                  variant={isMuted ? "default" : "outline"}
                  size="lg"
                  className={`h-14 w-14 rounded-full ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                  onClick={onToggleMute}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="h-16 w-16 rounded-full"
                  onClick={onEnd}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Call ended states - Close */}
            {(status === 'ended' || status === 'declined' || status === 'missed') && (
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 rounded-full bg-slate-700 hover:bg-slate-600 border-0"
                onClick={onClose}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCallModal;
