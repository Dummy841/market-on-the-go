import { useState, useEffect, useRef, useCallback } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'ongoing' | 'ended' | 'declined' | 'missed';

interface ZegoVoiceCallState {
  status: CallStatus;
  callId: string | null;
  roomId: string | null;
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  callerType: 'user' | 'delivery_partner' | null;
  callerName: string | null;
}

interface UseZegoVoiceCallProps {
  myId: string;
  myType: 'user' | 'delivery_partner';
  myName: string;
}

interface PendingCall {
  callId: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerType: 'user' | 'delivery_partner';
}

export const useZegoVoiceCall = ({ myId, myType, myName }: UseZegoVoiceCallProps) => {
  const [state, setState] = useState<ZegoVoiceCallState>({
    status: 'idle',
    callId: null,
    roomId: null,
    duration: 0,
    isMuted: false,
    isSpeaker: false,
    callerType: null,
    callerName: null,
  });
  
  const { toast } = useToast();
  const zegoRef = useRef<ReturnType<typeof ZegoUIKitPrebuilt.create> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const missedCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCallRef = useRef<PendingCall | null>(null);

  // Preload ringtone
  useEffect(() => {
    ringtoneRef.current = new Audio('/ringtone.mp3');
    ringtoneRef.current.preload = 'auto';
    ringtoneRef.current.loop = true;
  }, []);

  // Play/stop ringtone
  const playRingtone = useCallback(() => {
    ringtoneRef.current?.play().catch(console.error);
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // Duration timer
  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => {
      setState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Missed call timeout
  const clearMissedCallTimeout = useCallback(() => {
    if (missedCallTimeoutRef.current) {
      clearTimeout(missedCallTimeoutRef.current);
      missedCallTimeoutRef.current = null;
    }
  }, []);

  // Get token from edge function
  const getToken = useCallback(async (roomId: string): Promise<{ token: string; appId: number }> => {
    const { data, error } = await supabase.functions.invoke('get-zego-token', {
      body: { userId: myId, roomId, userName: myName }
    });

    if (error) throw error;
    return data;
  }, [myId, myName]);

  // Start a call to another user
  const startCall = useCallback(async (options: {
    receiverId: string;
    receiverName: string;
    chatId: string;
  }) => {
    const { receiverId, receiverName, chatId } = options;

    try {
      // Request microphone permission FIRST (user gesture)
      await navigator.mediaDevices.getUserMedia({ audio: true });

      setState({
        status: 'calling',
        callId: null,
        roomId: null,
        duration: 0,
        isMuted: false,
        isSpeaker: false,
        callerType: myType,
        callerName: myName,
      });

      // Generate room ID from chat ID
      const roomId = `call_${chatId}_${Date.now()}`;

      // Create call record
      const { data: callData, error: callError } = await supabase
        .from('voice_calls')
        .insert({
          chat_id: chatId,
          caller_type: myType,
          caller_id: myId,
          receiver_id: receiverId,
          status: 'ringing',
        })
        .select('id')
        .single();

      if (callError) throw callError;

      const callId = callData.id;
      setState(prev => ({ ...prev, callId, roomId }));

      // Get ZEGO token
      const tokenData = await getToken(roomId);
      
      // Create ZEGO instance
      const zp = ZegoUIKitPrebuilt.create(tokenData.token);
      zegoRef.current = zp;

      // Notify receiver via Supabase Realtime
      const channel = supabase.channel(`incoming-call-${receiverId}`);
      callChannelRef.current = channel;

      await channel.subscribe();
      
      channel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          callId,
          roomId,
          callerId: myId,
          callerName: myName,
          callerType: myType,
          appId: tokenData.appId,
        },
      });

      // Play ringback tone for caller
      playRingtone();

      // Set missed call timeout (30 seconds)
      missedCallTimeoutRef.current = setTimeout(async () => {
        setState(prev => {
          if (prev.status === 'calling' || prev.status === 'ringing') {
            stopRingtone();
            
            supabase
              .from('voice_calls')
              .update({ status: 'missed', ended_at: new Date().toISOString() })
              .eq('id', callId);

            cleanup();
            
            setTimeout(() => {
              setState({
                status: 'idle',
                callId: null,
                roomId: null,
                duration: 0,
                isMuted: false,
                isSpeaker: false,
                callerType: null,
                callerName: null,
              });
            }, 2000);

            return { ...prev, status: 'missed' as const };
          }
          return prev;
        });
      }, 30000);

      // Listen for call events
      channel.on('broadcast', { event: 'call-answered' }, async () => {
        console.log('Call answered, joining room...');
        stopRingtone();
        clearMissedCallTimeout();
        setState(prev => ({ ...prev, status: 'ongoing' }));
        startDurationTimer();

        // Join the ZEGO room
        if (zegoRef.current && containerRef.current) {
          zegoRef.current.joinRoom({
            container: containerRef.current,
            scenario: {
              mode: ZegoUIKitPrebuilt.OneONoneCall,
            },
            showPreJoinView: false,
            showScreenSharingButton: false,
            showMyCameraToggleButton: false,
            turnOnCameraWhenJoining: false,
            turnOnMicrophoneWhenJoining: true,
            onLeaveRoom: () => {
              endCall();
            },
            onUserLeave: () => {
              endCall();
            },
          });
        }

        // Update call status
        await supabase
          .from('voice_calls')
          .update({ status: 'ongoing', started_at: new Date().toISOString() })
          .eq('id', callId);
      });

      channel.on('broadcast', { event: 'call-declined' }, async () => {
        console.log('Call declined');
        stopRingtone();
        clearMissedCallTimeout();
        
        await supabase
          .from('voice_calls')
          .update({ status: 'declined', ended_at: new Date().toISOString() })
          .eq('id', callId);

        cleanup();
        setState(prev => ({ ...prev, status: 'declined' }));
        
        setTimeout(() => {
          setState({
            status: 'idle',
            callId: null,
            roomId: null,
            duration: 0,
            isMuted: false,
            isSpeaker: false,
            callerType: null,
            callerName: null,
          });
        }, 2000);
      });

    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: "Could not start the call. Please try again.",
        variant: "destructive",
      });
      cleanup();
      setState({
        status: 'idle',
        callId: null,
        roomId: null,
        duration: 0,
        isMuted: false,
        isSpeaker: false,
        callerType: null,
        callerName: null,
      });
    }
  }, [myId, myType, myName, getToken, playRingtone, stopRingtone, clearMissedCallTimeout, startDurationTimer, toast]);

  // Handle incoming call
  const handleIncomingCall = useCallback((payload: PendingCall & { appId?: number }) => {
    if (state.status !== 'idle') return;

    console.log('Incoming call:', payload);
    
    pendingCallRef.current = payload;
    playRingtone();
    
    setState({
      status: 'ringing',
      callId: payload.callId,
      roomId: payload.roomId,
      duration: 0,
      isMuted: false,
      isSpeaker: false,
      callerType: payload.callerType,
      callerName: payload.callerName,
    });

    // Notify caller that we're ringing
    const channel = supabase.channel(`incoming-call-${payload.callerId}`);
    channel.subscribe(() => {
      channel.send({
        type: 'broadcast',
        event: 'call-ringing',
        payload: { callId: payload.callId },
      });
    });
  }, [state.status, playRingtone]);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    const pending = pendingCallRef.current;
    if (!pending) {
      console.error('No pending call to answer');
      toast({
        title: "Call Error",
        description: "No incoming call found.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Request microphone FIRST (user gesture)
      await navigator.mediaDevices.getUserMedia({ audio: true });

      stopRingtone();
      setState(prev => ({ ...prev, status: 'ongoing' }));
      startDurationTimer();

      // Get token
      const tokenData = await getToken(pending.roomId);
      
      // Create ZEGO instance and join room
      const zp = ZegoUIKitPrebuilt.create(tokenData.token);
      zegoRef.current = zp;

      if (containerRef.current) {
        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: false,
          showScreenSharingButton: false,
          showMyCameraToggleButton: false,
          turnOnCameraWhenJoining: false,
          turnOnMicrophoneWhenJoining: true,
          onLeaveRoom: () => {
            endCall();
          },
          onUserLeave: () => {
            endCall();
          },
        });
      }

      // Notify caller that call is answered
      const channel = supabase.channel(`incoming-call-${pending.callerId}`);
      await channel.subscribe();
      channel.send({
        type: 'broadcast',
        event: 'call-answered',
        payload: { callId: pending.callId },
      });

      // Update call status
      await supabase
        .from('voice_calls')
        .update({ status: 'ongoing', started_at: new Date().toISOString() })
        .eq('id', pending.callId);

      pendingCallRef.current = null;

    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: "Call Failed",
        description: "Could not connect. Please allow microphone access.",
        variant: "destructive",
      });
      cleanup();
      setState({
        status: 'idle',
        callId: null,
        roomId: null,
        duration: 0,
        isMuted: false,
        isSpeaker: false,
        callerType: null,
        callerName: null,
      });
    }
  }, [getToken, stopRingtone, startDurationTimer, toast]);

  // Decline incoming call
  const declineCall = useCallback(async () => {
    stopRingtone();
    
    const pending = pendingCallRef.current;
    if (pending) {
      // Notify caller
      const channel = supabase.channel(`incoming-call-${pending.callerId}`);
      await channel.subscribe();
      channel.send({
        type: 'broadcast',
        event: 'call-declined',
        payload: { callId: pending.callId },
      });

      await supabase
        .from('voice_calls')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('id', pending.callId);
    }

    cleanup();
    pendingCallRef.current = null;
    setState({
      status: 'idle',
      callId: null,
      roomId: null,
      duration: 0,
      isMuted: false,
      isSpeaker: false,
      callerType: null,
      callerName: null,
    });
  }, [stopRingtone]);

  // End ongoing call
  const endCall = useCallback(async () => {
    stopRingtone();
    stopDurationTimer();
    clearMissedCallTimeout();

    // Leave ZEGO room
    if (zegoRef.current) {
      try {
        zegoRef.current.destroy();
      } catch (e) {
        console.error('Error destroying ZEGO:', e);
      }
      zegoRef.current = null;
    }

    // Update call record
    setState(prev => {
      if (prev.callId) {
        supabase
          .from('voice_calls')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_seconds: prev.duration,
          })
          .eq('id', prev.callId);
      }
      return { ...prev, status: 'ended' as const };
    });

    cleanup();
    
    setTimeout(() => {
      setState({
        status: 'idle',
        callId: null,
        roomId: null,
        duration: 0,
        isMuted: false,
        isSpeaker: false,
        callerType: null,
        callerName: null,
      });
    }, 2000);
  }, [stopRingtone, stopDurationTimer, clearMissedCallTimeout]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setState(prev => {
      const newMuted = !prev.isMuted;
      // Note: ZegoUIKitPrebuilt handles mute internally via its UI
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setState(prev => ({ ...prev, isSpeaker: !prev.isSpeaker }));
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    stopDurationTimer();
    clearMissedCallTimeout();

    if (zegoRef.current) {
      try {
        zegoRef.current.destroy();
      } catch (e) {
        console.error('Error destroying ZEGO:', e);
      }
      zegoRef.current = null;
    }

    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
  }, [stopDurationTimer, clearMissedCallTimeout]);

  // Listen for incoming calls
  useEffect(() => {
    if (!myId) return;

    const channel = supabase.channel(`incoming-call-${myId}`);
    
    channel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        handleIncomingCall(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, handleIncomingCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      stopRingtone();
    };
  }, [cleanup, stopRingtone]);

  // Set container ref
  const setCallContainer = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
  }, []);

  return {
    state,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    setCallContainer,
  };
};
