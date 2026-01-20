import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface VoiceCallModalProps {
  open: boolean;
  status: 'idle' | 'calling' | 'ringing' | 'ongoing' | 'ended' | 'declined' | 'missed';
  partnerName: string;
  partnerAvatar?: string | null;
  showAvatar?: boolean; // Whether to show avatar image (false for delivery partners)
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  isIncoming: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
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
  showAvatar = true,
  duration,
  isMuted,
  isSpeaker,
  isIncoming,
  onAnswer,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  onClose,
}: VoiceCallModalProps) => {
  
  // Wrapper for button clicks to stop event propagation
  const handleButtonClick = (handler: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };
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
        return isIncoming ? 'Incoming Call' : 'Ringing...';
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

  // Use Portal to render at document body level for true full-screen
  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: '100vw', 
        height: '100vh',
        margin: 0,
        padding: 0,
      }}
    >
        <div className="flex flex-col items-center justify-center h-full py-12 px-6 space-y-8">
          {/* Avatar with pulse animation */}
          <div className="relative">
            <div 
              className={`absolute inset-0 rounded-full bg-primary/30 ${
                (status === 'ringing' || status === 'calling') && pulseAnimation 
                  ? 'animate-ping' 
                  : ''
              }`}
              style={{ transform: 'scale(1.3)' }}
            />
            <div 
              className={`absolute inset-0 rounded-full bg-primary/20 ${
                (status === 'ringing' || status === 'calling')
                  ? 'animate-pulse' 
                  : ''
              }`}
              style={{ transform: 'scale(1.5)' }}
            />
            <Avatar className="h-32 w-32 border-4 border-primary/50 relative z-10">
              {showAvatar && partnerAvatar ? (
                <AvatarImage src={partnerAvatar} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                {partnerName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name and Status */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{partnerName}</h2>
            <p className={`text-lg ${
              status === 'ongoing' ? 'text-green-400' : 
              status === 'ringing' && isIncoming ? 'text-primary animate-pulse' :
              'text-slate-400'
            }`}>
              {getStatusText()}
            </p>
          </div>

          {/* Call Controls */}
          <div className="flex flex-col items-center gap-8 pt-8">
            {/* Incoming call - Answer and Decline */}
            {status === 'ringing' && isIncoming && (
              <div className="flex items-center justify-center gap-12">
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30"
                    onClick={handleButtonClick(onDecline)}
                  >
                    <PhoneOff className="h-8 w-8" />
                  </Button>
                  <span className="text-sm text-slate-400">Decline</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    className="h-20 w-20 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30 animate-pulse"
                    onClick={handleButtonClick(onAnswer)}
                  >
                    <PhoneIncoming className="h-8 w-8" />
                  </Button>
                  <span className="text-sm text-slate-400">Answer</span>
                </div>
              </div>
            )}

            {/* Outgoing call (calling/ringing) - Mute, Speaker, End */}
            {(status === 'calling' || (status === 'ringing' && !isIncoming)) && (
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={`h-16 w-16 rounded-full border-0 ${
                      isMuted 
                        ? 'bg-red-500/80 hover:bg-red-600 text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                    onClick={handleButtonClick(onToggleMute)}
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>
                  <span className="text-xs text-slate-400">{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30"
                    onClick={handleButtonClick(onEnd)}
                  >
                    <PhoneOff className="h-8 w-8" />
                  </Button>
                  <span className="text-sm text-slate-400">End Call</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={`h-16 w-16 rounded-full border-0 ${
                      isSpeaker 
                        ? 'bg-primary/80 hover:bg-primary text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                    onClick={handleButtonClick(onToggleSpeaker)}
                  >
                    {isSpeaker ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                  </Button>
                  <span className="text-xs text-slate-400">{isSpeaker ? 'Speaker' : 'Earpiece'}</span>
                </div>
              </div>
            )}

            {/* Ongoing call - Mute, End, Speaker */}
            {status === 'ongoing' && (
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={`h-16 w-16 rounded-full border-0 ${
                      isMuted 
                        ? 'bg-red-500/80 hover:bg-red-600 text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                    onClick={handleButtonClick(onToggleMute)}
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>
                  <span className="text-xs text-slate-400">{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30"
                    onClick={handleButtonClick(onEnd)}
                  >
                    <PhoneOff className="h-8 w-8" />
                  </Button>
                  <span className="text-sm text-slate-400">End Call</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={`h-16 w-16 rounded-full border-0 ${
                      isSpeaker 
                        ? 'bg-primary/80 hover:bg-primary text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                    onClick={handleButtonClick(onToggleSpeaker)}
                  >
                    {isSpeaker ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                  </Button>
                  <span className="text-xs text-slate-400">{isSpeaker ? 'Speaker' : 'Earpiece'}</span>
                </div>
              </div>
            )}

            {/* Call ended states - Close */}
            {(status === 'ended' || status === 'declined' || status === 'missed') && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-14 px-12 rounded-full bg-slate-700 hover:bg-slate-600 border-0 text-white"
                onClick={handleButtonClick(onClose)}
              >
                Close
              </Button>
            )}
          </div>
        </div>
    </div>,
    document.body
  );
};

export default VoiceCallModal;
