import { useState, useEffect, useRef, useCallback } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RINGTONE_DATA_URL } from "@/lib/ringtoneDataUrl";

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
  const audioUnlockedRef = useRef(false);
  const missedCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callRowChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCallRef = useRef<PendingCall | null>(null);
  const endingRef = useRef(false);

  // Preload ringtone
  useEffect(() => {
    // Use a data-url ringtone to avoid "The element has no supported sources" errors.
    ringtoneRef.current = new Audio(RINGTONE_DATA_URL);
    ringtoneRef.current.preload = 'auto';
    ringtoneRef.current.loop = true;
  }, []);

  // Unlock audio on first user interaction (required for reliable ringtone playback)
  useEffect(() => {
    const unlock = async () => {
      if (audioUnlockedRef.current) return;
      const audio = ringtoneRef.current;
      if (!audio) return;

      try {
        const prevVolume = audio.volume;
        audio.volume = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.volume = prevVolume;
        audioUnlockedRef.current = true;
      } catch {
        // If this fails, we'll keep trying on subsequent gestures.
      }
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Play/stop ringtone
  const playRingtone = useCallback(() => {
    const audio = ringtoneRef.current;
    if (!audio) return;

    // Try play; if blocked by autoplay policy, it will reject.
    audio.play().catch((err) => {
      console.warn('Ringtone play blocked/unavailable:', err);
    });
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

    if (callRowChannelRef.current) {
      supabase.removeChannel(callRowChannelRef.current);
      callRowChannelRef.current = null;
    }
  }, [stopDurationTimer, clearMissedCallTimeout]);

  // End ongoing call (internal)
  const endCallInternal = useCallback(async (options?: { notifyRemote?: boolean }) => {
    const notifyRemote = options?.notifyRemote ?? true;

    // Prevent double-end loops (e.g., local end triggers remote end triggers local end)
    if (endingRef.current) return;
    endingRef.current = true;

    stopRingtone();
    stopDurationTimer();
    clearMissedCallTimeout();

    // Notify other side ASAP (before we tear down channels)
    const currentCallId = state.callId;
    if (notifyRemote && currentCallId && callChannelRef.current) {
      try {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'call-ended',
          payload: { callId: currentCallId },
        });
      } catch (e) {
        console.warn('Failed to broadcast call-ended:', e);
      }
    }

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
      endingRef.current = false;
    }, 2000);
  }, [stopRingtone, stopDurationTimer, clearMissedCallTimeout, state.callId, cleanup]);

  const endCall = useCallback(async () => {
    await endCallInternal({ notifyRemote: true });
  }, [endCallInternal]);

  // DB fallback: keep both sides in sync even if broadcast events are missed.
  const subscribeToCallRow = useCallback((callId: string) => {
    // Reset previous
    if (callRowChannelRef.current) {
      supabase.removeChannel(callRowChannelRef.current);
      callRowChannelRef.current = null;
    }

    const rowChannel = supabase
      .channel(`voice-call-row-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voice_calls',
          filter: `id=eq.${callId}`,
        },
        async (payload) => {
          const next = payload.new as { status?: string };
          const status = next?.status;
          if (!status) return;

          if (status === 'ongoing') {
            setState((prev) => {
              if (prev.callId !== callId) return prev;
              if (prev.status === 'ongoing') return prev;
              return { ...prev, status: 'ongoing' };
            });
          }

          if (status === 'ended' || status === 'declined' || status === 'missed') {
            await endCallInternal({ notifyRemote: false });
          }
        }
      );

    callRowChannelRef.current = rowChannel;
    rowChannel.subscribe();
  }, [endCallInternal]);

  // Get credentials from edge function
  const getCredentials = useCallback(async (roomId: string): Promise<{ 
    appId: number; 
    serverSecret: string;
    userId: string;
    roomId: string;
    userName: string;
  }> => {
    // ZEGO userID/roomID constraints: alphanumeric, max 32 chars
    const zegoUserId = (myId || 'guest')
      .toString()
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 32);

    if (!zegoUserId || zegoUserId.length < 2) {
      throw new Error('Invalid user ID for voice call');
    }

    const { data, error } = await supabase.functions.invoke('get-zego-token', {
      body: { userId: zegoUserId, roomId, userName: myName }
    });

    if (error) throw new Error(error.message || 'Failed to get call credentials');
    if (!data?.appId || !data?.serverSecret) throw new Error('Invalid credentials from server');
    
    return data;
  }, [myId, myName]);

  // Start a call to another user
  const startCall = useCallback(async (options: {
    receiverId: string;
    receiverName: string;
    chatId: string;
  }) => {
    const { receiverId, receiverName, chatId } = options;

    console.log('Starting call to:', { receiverId, receiverName, chatId, myId, myType, myName });

    // Check if already in a call
    if (state.status !== 'idle') {
      console.warn('Already in a call, ignoring new call request');
      return;
    }

    try {
      // Request microphone permission FIRST with better error handling
      try {
        console.log('Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        console.log('Microphone permission granted');
      } catch (micError: any) {
        console.error('Microphone permission error:', micError);
        toast({
          title: "Microphone Required",
          description: "Please allow microphone access to make calls. Check your browser settings.",
          variant: "destructive",
        });
        return;
      }

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
      const roomId = `c_${chatId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}_${Date.now().toString(36)}`;

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

      // Fallback sync via DB row updates.
      subscribeToCallRow(callId);

      // Use a dedicated call-scoped channel for signaling (answer/decline/ringing)
      // This avoids mismatched per-user channels causing "answered" events to be missed.
      const signalChannel = supabase.channel(`voice-call-${callId}`);
      callChannelRef.current = signalChannel;

      // IMPORTANT: attach listeners BEFORE subscribe to avoid missing fast events.
      signalChannel.on('broadcast', { event: 'call-ringing' }, ({ payload }) => {
        if (payload?.callId !== callId) return;
        setState(prev => (prev.status === 'calling' ? { ...prev, status: 'ringing' } : prev));
      });

      signalChannel.on('broadcast', { event: 'call-ended' }, async ({ payload }) => {
        if (payload?.callId !== callId) return;
        console.log('Remote ended call');
        await endCallInternal({ notifyRemote: false });
      });

      signalChannel.on('broadcast', { event: 'call-answered' }, async ({ payload }) => {
        if (payload?.callId !== callId) return;
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
              endCallInternal({ notifyRemote: true });
            },
            onUserLeave: () => {
              endCallInternal({ notifyRemote: true });
            },
          });
        }

        // Update call status
        await supabase
          .from('voice_calls')
          .update({ status: 'ongoing', started_at: new Date().toISOString() })
          .eq('id', callId);
      });

      signalChannel.on('broadcast', { event: 'call-declined' }, async ({ payload }) => {
        if (payload?.callId !== callId) return;
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

      await signalChannel.subscribe();

      // Get ZEGO credentials from server
      const creds = await getCredentials(roomId);
      console.log('Got ZEGO credentials:', { appId: creds.appId, userId: creds.userId, roomId });
      
      // Create ZEGO instance using generateKitTokenForTest with server-provided credentials
      let zp: ReturnType<typeof ZegoUIKitPrebuilt.create> | null = null;
      try {
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          creds.appId,
          creds.serverSecret,
          creds.roomId,
          creds.userId,
          creds.userName
        );
        console.log('Generated kitToken, creating ZEGO instance...');
        zp = ZegoUIKitPrebuilt.create(kitToken);
        if (!zp) {
          throw new Error('Voice call service failed to initialize');
        }
        console.log('ZEGO instance created successfully');
      } catch (sdkError: any) {
        console.error('ZEGO SDK create error:', sdkError);
        throw new Error('Voice call service unavailable. Please try again.');
      }
      zegoRef.current = zp;

      // Notify receiver via Supabase Realtime
      const receiverChannel = supabase.channel(`incoming-call-${receiverId}`);
      await receiverChannel.subscribe();

      receiverChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          callId,
          roomId,
          callerId: myId,
          callerName: myName,
          callerType: myType,
          appId: creds.appId,
        },
      });

      // We don't need to keep the receiver channel open.
      supabase.removeChannel(receiverChannel);

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

    } catch (error: any) {
      console.error('Error starting call:', error);
      const errorMessage = error?.message || 'Could not start the call';
      toast({
        title: "Call Failed",
        description: `${errorMessage}. Please check your connection and try again.`,
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
  }, [myId, myType, myName, state.status, getCredentials, playRingtone, stopRingtone, clearMissedCallTimeout, startDurationTimer, toast, endCallInternal]);

  // Handle incoming call
  const handleIncomingCall = useCallback((payload: PendingCall & { appId?: number }) => {
    if (state.status !== 'idle') return;

    console.log('Incoming call:', payload);
    
    pendingCallRef.current = payload;

    // Subscribe to call-scoped signaling channel so caller can reliably receive answered/declined.
    const signalChannel = supabase.channel(`voice-call-${payload.callId}`);
    callChannelRef.current = signalChannel;

    // Also sync via DB row updates (fallback).
    subscribeToCallRow(payload.callId);

    // Attach listeners BEFORE subscribe.

    signalChannel.on('broadcast', { event: 'call-ended' }, async ({ payload: endPayload }) => {
      if (endPayload?.callId !== payload.callId) return;
      console.log('Caller ended call while ringing/ongoing');
      await endCallInternal({ notifyRemote: false });
    });

    signalChannel.subscribe();

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

    // Notify caller that we're ringing (on the call-scoped signaling channel)
    signalChannel.send({
      type: 'broadcast',
      event: 'call-ringing',
      payload: { callId: payload.callId },
    });
  }, [state.status, playRingtone, endCallInternal, subscribeToCallRow]);

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());

      stopRingtone();
      setState(prev => ({ ...prev, status: 'ongoing' }));
      startDurationTimer();

      // Get credentials from server
      const creds = await getCredentials(pending.roomId);
      console.log('Got ZEGO credentials for answer:', { appId: creds.appId, userId: creds.userId });
      
      // Create ZEGO instance using generateKitTokenForTest
      let zp: ReturnType<typeof ZegoUIKitPrebuilt.create> | null = null;
      try {
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          creds.appId,
          creds.serverSecret,
          creds.roomId,
          creds.userId,
          creds.userName
        );
        console.log('Generated kitToken for answer, creating ZEGO instance...');
        zp = ZegoUIKitPrebuilt.create(kitToken);
        if (!zp) {
          throw new Error('Voice call service failed to initialize');
        }
        console.log('ZEGO instance created successfully for answer');
      } catch (sdkError: any) {
        console.error('ZEGO SDK create error:', sdkError);
        throw new Error('Voice call service unavailable. Please try again.');
      }
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
            endCallInternal({ notifyRemote: true });
          },
          onUserLeave: () => {
            endCallInternal({ notifyRemote: true });
          },
        });
      }

      // Notify caller that call is answered
      const signalChannel = callChannelRef.current;
      if (signalChannel) {
        signalChannel.send({
          type: 'broadcast',
          event: 'call-answered',
          payload: { callId: pending.callId },
        });
      }

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
  }, [getCredentials, myName, stopRingtone, startDurationTimer, toast, endCallInternal]);

  // Decline incoming call
  const declineCall = useCallback(async () => {
    stopRingtone();
    
    const pending = pendingCallRef.current;
    if (pending) {
      // Notify caller (call-scoped channel)
      const signalChannel = callChannelRef.current;
      if (signalChannel) {
        signalChannel.send({
          type: 'broadcast',
          event: 'call-declined',
          payload: { callId: pending.callId },
        });
      }

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
