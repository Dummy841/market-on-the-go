import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallStatus } from '@/hooks/useZegoVoiceCall';

interface ZegoVoiceCallModalProps {
  open: boolean;
  status: CallStatus;
  partnerName: string;
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  isIncoming: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  setCallContainer: (element: HTMLDivElement | null) => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ZegoVoiceCallModal = ({
  open,
  status,
  partnerName,
  duration,
  isMuted,
  isSpeaker,
  isIncoming,
  onAnswer,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  setCallContainer,
}: ZegoVoiceCallModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setCallContainer(containerRef.current);
    }
    return () => {
      setCallContainer(null);
    };
  }, [setCallContainer]);

  if (!open) return null;

  const getStatusText = () => {
    switch (status) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return isIncoming ? 'Incoming call' : 'Ringing...';
      case 'ongoing':
        return formatDuration(duration);
      case 'ended':
        return 'Call ended';
      case 'declined':
        return 'Call declined';
      case 'missed':
        return 'Missed call';
      default:
        return '';
    }
  };

  const showAnswerDecline = status === 'ringing' && isIncoming;
  const showEndCall = status === 'calling' || status === 'ongoing' || (status === 'ringing' && !isIncoming);
  const showControls = status === 'ongoing';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-primary/90 to-primary"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* ZEGO Container - Hidden but needed for audio */}
      <div 
        ref={containerRef} 
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 1, height: 1 }}
      />

      {/* Call Info */}
      <div className="flex flex-col items-center gap-4 mb-auto mt-20">
        <div className="w-24 h-24 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <span className="text-4xl text-primary-foreground font-bold">
            {partnerName.charAt(0).toUpperCase()}
          </span>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary-foreground">{partnerName}</h2>
          <p className="text-primary-foreground/80 text-lg mt-2">{getStatusText()}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-20 flex flex-col items-center gap-8">
        {/* Audio Controls */}
        {showControls && (
          <div className="flex gap-6">
            <Button
              variant="ghost"
              size="lg"
              onClick={onToggleMute}
              className={`w-16 h-16 rounded-full ${
                isMuted ? 'bg-destructive' : 'bg-primary-foreground/20'
              }`}
            >
              {isMuted ? (
                <MicOff className="h-7 w-7 text-primary-foreground" />
              ) : (
                <Mic className="h-7 w-7 text-primary-foreground" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="lg"
              onClick={onToggleSpeaker}
              className={`w-16 h-16 rounded-full ${
                isSpeaker ? 'bg-primary-foreground/40' : 'bg-primary-foreground/20'
              }`}
            >
              {isSpeaker ? (
                <Volume2 className="h-7 w-7 text-primary-foreground" />
              ) : (
                <VolumeX className="h-7 w-7 text-primary-foreground" />
              )}
            </Button>
          </div>
        )}

        {/* Answer/Decline for incoming calls */}
        {showAnswerDecline && (
          <div className="flex gap-12">
            <Button
              variant="ghost"
              size="lg"
              onClick={onDecline}
              className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90"
            >
              <PhoneOff className="h-10 w-10 text-white" />
            </Button>
            
            <Button
              variant="ghost"
              size="lg"
              onClick={onAnswer}
              className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600"
            >
              <Phone className="h-10 w-10 text-white" />
            </Button>
          </div>
        )}

        {/* End call button */}
        {showEndCall && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onEnd}
            className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90"
          >
            <PhoneOff className="h-10 w-10 text-white" />
          </Button>
        )}

        {/* Auto-close for ended states */}
        {(status === 'ended' || status === 'declined' || status === 'missed') && (
          <p className="text-primary-foreground/60 text-sm">Closing...</p>
        )}
      </div>
    </div>
  );
};

export default ZegoVoiceCallModal;
