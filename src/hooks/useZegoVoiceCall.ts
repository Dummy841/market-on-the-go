import { useState, useEffect, useRef, useCallback } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RINGTONE_DATA_URL } from "@/lib/ringtoneDataUrl";
import { useNativeNotifications, registerCallActionCallback, unregisterCallActionCallback } from "@/hooks/useNativeNotifications";

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
  const { showIncomingCallNotification, dismissIncomingCallNotification, isNative } = useNativeNotifications();
  
  const zegoRef = useRef<ReturnType<typeof ZegoUIKitPrebuilt.create> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
   const ringbackRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const joinedRoomRef = useRef(false);
  const latestStateRef = useRef<ZegoVoiceCallState>(state);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nativeNotificationIdRef = useRef<number | null>(null);
  const missedCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callRowChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCallRef = useRef<PendingCall | null>(null);
  const endingRef = useRef(false);
   const zegoInstanceReadyRef = useRef(false);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  // Preload ringtone
  useEffect(() => {
    // Prefer the bundled/public ringtone mp3 (user-provided), with a safe fallback to data-url.
    // (Some WebViews can fail to load certain file types; the data-url beep is our fallback.)
    const audio = new Audio('/ringtone.mp3');
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 1.0;

    // If mp3 fails to load/play, fallback to the data URL.
    audio.addEventListener('error', () => {
      try {
        const fallback = new Audio(RINGTONE_DATA_URL);
        fallback.preload = 'auto';
        fallback.loop = true;
        ringtoneRef.current = fallback;
      } catch {
        // Ignore
      }
    });

    ringtoneRef.current = audio;
     
     // Preload ringback tone (played on caller's device while waiting)
     const ringback = new Audio('/ringback.mp3');
     ringback.preload = 'auto';
     ringback.loop = true;
     ringback.volume = 1.0;
     ringbackRef.current = ringback;

     // Force load both audio files
     audio.load();
     ringback.load();
  }, []);

  // Unlock audio on first user interaction (required for reliable ringtone playback)
  useEffect(() => {
    const unlock = async () => {
      if (audioUnlockedRef.current) return;

      try {
         // Unlock ringtone
         if (ringtoneRef.current) {
           const prevVolume = ringtoneRef.current.volume;
           ringtoneRef.current.volume = 0;
           await ringtoneRef.current.play();
           ringtoneRef.current.pause();
           ringtoneRef.current.currentTime = 0;
           ringtoneRef.current.volume = prevVolume;
         }
         // Unlock ringback
         if (ringbackRef.current) {
           const prevVolume = ringbackRef.current.volume;
           ringbackRef.current.volume = 0;
           await ringbackRef.current.play();
           ringbackRef.current.pause();
           ringbackRef.current.currentTime = 0;
           ringbackRef.current.volume = prevVolume;
         }
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

  // Start vibration pattern for incoming calls (fallback when audio blocked)
  const startVibration = useCallback(() => {
    // Stop any existing vibration
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
    }

    // Check if vibration API is available
    if (!('vibrate' in navigator)) return;

    // Vibrate immediately
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch (e) {
      console.warn('Vibration not supported:', e);
      return;
    }

    // Repeat vibration pattern every 2 seconds
    vibrationIntervalRef.current = setInterval(() => {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } catch {
        // Ignore
      }
    }, 2000);
  }, []);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    // Stop any ongoing vibration
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }, []);

  // Show browser notification fallback for incoming calls (web only)
  const showBrowserNotification = useCallback((callerName: string) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        new Notification('📞 Incoming Call', {
          body: `${callerName} is calling...`,
          icon: '/favicon.ico',
          requireInteraction: true,
          tag: 'incoming-call',
        });
      } catch (e) {
        console.warn('Browser notification failed:', e);
      }
    } else if (Notification.permission !== 'denied') {
      // Request permission for future calls
      Notification.requestPermission();
    }
  }, []);

   // Play ringback tone (caller hears this while waiting for answer)
   const playRingback = useCallback(() => {
     const audio = ringbackRef.current;
     if (!audio) return;
 
     audio.play().catch((err) => {
       console.warn('Ringback play blocked/unavailable:', err);
     });
   }, []);
 
   const stopRingback = useCallback(() => {
     if (ringbackRef.current) {
       ringbackRef.current.pause();
       ringbackRef.current.currentTime = 0;
     }
   }, []);
 
  // Play/stop ringtone with vibration + notification fallback
  const playRingtone = useCallback((callerName?: string) => {
    const audio = ringtoneRef.current;
    if (!audio) {
      console.warn('Ringtone audio element not available');
      // Still try vibration/notification fallback
      startVibration();
      if (callerName) {
        showBrowserNotification(callerName);
      }
      return;
    }

    // Reset to beginning
    audio.currentTime = 0;

    // Try play; if blocked by autoplay policy, it will reject.
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('Ringtone playing successfully');
      }).catch((err) => {
        console.warn('Ringtone play blocked/unavailable:', err);
        
        // Fallback 1: Start vibration pattern
        startVibration();
        
        // Fallback 2: Show browser notification (web only fallback)
        if (callerName) {
          showBrowserNotification(callerName);
        }

        // Guide the user
        toast({
          title: 'Sound blocked',
          description: 'Tap the screen once to enable ringtone/voice audio.',
        });
      });
    }
  }, [toast, startVibration, showBrowserNotification]);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    // Also stop vibration
    stopVibration();
     // Also stop ringback if playing
     stopRingback();
   }, [stopVibration, stopRingback]);

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
    stopVibration();
    joinedRoomRef.current = false;
     zegoInstanceReadyRef.current = false;

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
  }, [stopDurationTimer, clearMissedCallTimeout, stopVibration]);

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
      joinedRoomRef.current = false;
    }, 2000);
  }, [stopRingtone, stopDurationTimer, clearMissedCallTimeout, state.callId, cleanup]);

  const endCall = useCallback(async () => {
    await endCallInternal({ notifyRemote: true });
  }, [endCallInternal]);

  // Join the ZEGO room as soon as BOTH: (zego instance exists) AND (modal container exists).
  // This fixes the common race where the timer starts but audio never connects because joinRoom
  // fired before ZegoVoiceCallModal mounted and called setCallContainer().
  const tryJoinRoom = useCallback((source: 'caller' | 'callee' | 'container-ready') => {
    const s = latestStateRef.current;
    if (s.status !== 'ongoing') return;
    if (joinedRoomRef.current) return;
    if (!zegoRef.current) return;
    if (!containerRef.current) return;
     if (!zegoInstanceReadyRef.current) return;

    joinedRoomRef.current = true;

    try {
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
           if (!endingRef.current) {
             endCallInternal({ notifyRemote: true });
           }
        },
        onUserLeave: () => {
           if (!endingRef.current) {
             endCallInternal({ notifyRemote: true });
           }
        },
      });
      console.log(`[ZEGO] joinRoom executed (${source})`);
    } catch (e) {
      console.error('[ZEGO] joinRoom failed:', e);
      joinedRoomRef.current = false;
    }
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
       // Start ringback tone (caller hears this while waiting for answer)
       playRingback();

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

      // NOTE: In UI, `callerName/callerType` represent the *other party* (the person you are calling / who is calling you).
      // This keeps Incoming/Calling screens consistent for both directions.
      const remoteType: 'user' | 'delivery_partner' = myType === 'user' ? 'delivery_partner' : 'user';

      setState({
        status: 'calling',
        callId: null,
        roomId: null,
        duration: 0,
        isMuted: false,
        isSpeaker: false,
        callerType: remoteType,
        callerName: receiverName,
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
      // IMPORTANT:
      // `call-ringing` is sent by the callee to indicate they received the incoming call event.
      // The CALLER should stay in `calling` state (showing End/Mute/Speaker) and *must not*
      // transition to `ringing`, otherwise our UI will incorrectly show the incoming-call screen.
      signalChannel.on('broadcast', { event: 'call-ringing' }, ({ payload }) => {
        if (payload?.callId !== callId) return;
        // no-op (kept for potential future UI text changes)
      });

      signalChannel.on('broadcast', { event: 'call-ended' }, async ({ payload }) => {
        if (payload?.callId !== callId) return;
        console.log('Remote ended call');
        await endCallInternal({ notifyRemote: false });
      });

      signalChannel.on('broadcast', { event: 'call-answered' }, async ({ payload }) => {
        if (payload?.callId !== callId) return;
        console.log('Call answered, joining room...');
         stopRingback();
        clearMissedCallTimeout();
        setState(prev => ({ ...prev, status: 'ongoing' }));
        startDurationTimer();

        // Join once the modal container is ready.
        tryJoinRoom('caller');

        // Update call status
        await supabase
          .from('voice_calls')
          .update({ status: 'ongoing', started_at: new Date().toISOString() })
          .eq('id', callId);
      });

      signalChannel.on('broadcast', { event: 'call-declined' }, async ({ payload }) => {
        if (payload?.callId !== callId) return;
        console.log('Call declined');
         stopRingback();
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
       zegoInstanceReadyRef.current = true;

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

      // Set missed call timeout (30 seconds)
       missedCallTimeoutRef.current = setTimeout(async () => {
        setState(prev => {
           // Caller times out while waiting (caller remains in `calling` state).
           if (prev.status === 'calling') {
             stopRingback();
            
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
  const handleIncomingCall = useCallback(async (payload: PendingCall & { appId?: number }) => {
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

    // Show native notification for incoming call (works when app is backgrounded)
    if (isNative) {
      const notifId = await showIncomingCallNotification(payload.callerName, payload.callId);
      nativeNotificationIdRef.current = notifId;
      
      // Register callback for notification actions (Answer/Decline buttons)
      registerCallActionCallback(payload.callId, (action) => {
        if (action === 'answer') {
          // This will be handled by answerCall
          // The app should already be in foreground from the notification tap
        } else if (action === 'decline') {
          // Trigger decline
          declineCallRef.current?.();
        }
      });
    }

    playRingtone(payload.callerName);
    
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
  }, [state.status, playRingtone, endCallInternal, subscribeToCallRow, isNative, showIncomingCallNotification]);

  // Ref for decline callback (used by native notification action)
  const declineCallRef = useRef<(() => Promise<void>) | null>(null);

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
      // Dismiss native notification if present
      if (nativeNotificationIdRef.current !== null) {
        dismissIncomingCallNotification(nativeNotificationIdRef.current);
        nativeNotificationIdRef.current = null;
      }
      // Unregister native callback
      if (pending.callId) {
        unregisterCallActionCallback(pending.callId);
      }

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
       zegoInstanceReadyRef.current = true;

      // Join once the modal container is ready.
      tryJoinRoom('callee');

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
  }, [getCredentials, myName, stopRingtone, startDurationTimer, toast, endCallInternal, dismissIncomingCallNotification]);

  // Decline incoming call
  const declineCall = useCallback(async () => {
    stopRingtone();
    
    const pending = pendingCallRef.current;
    
    // Dismiss native notification if present
    if (nativeNotificationIdRef.current !== null) {
      dismissIncomingCallNotification(nativeNotificationIdRef.current);
      nativeNotificationIdRef.current = null;
    }
    
    // Unregister native callback
    if (pending?.callId) {
      unregisterCallActionCallback(pending.callId);
    }
    
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
  }, [stopRingtone, dismissIncomingCallNotification, cleanup]);

  // Keep declineCallRef updated for native notification callbacks
  useEffect(() => {
    declineCallRef.current = declineCall;
  }, [declineCall]);

   // Toggle mute - control ZEGO audio
   const toggleMute = useCallback(async () => {
     const zego = zegoRef.current;
     const newMuted = !latestStateRef.current.isMuted;
     
     if (zego) {
       try {
          // Prefer UIKit-level API when available.
          const ui = zego as any;
          if (typeof ui.setMicrophoneOn === 'function') {
            // setMicrophoneOn(true) => mic enabled
            await ui.setMicrophoneOn(!newMuted);
          }

         const engine = (zego as any).zegoExpressEngine;
         if (engine && typeof engine.muteMicrophone === 'function') {
           await engine.muteMicrophone(newMuted);
         } else if (engine && typeof engine.enableMic === 'function') {
           await engine.enableMic(!newMuted);
         }
       } catch (e) {
         console.warn('Failed to toggle mute:', e);
       }
     }
     
     setState(prev => ({ ...prev, isMuted: newMuted }));
  }, []);

   // Toggle speaker - control audio output
   const toggleSpeaker = useCallback(async () => {
     const zego = zegoRef.current;
     const newSpeaker = !latestStateRef.current.isSpeaker;
     
     if (zego) {
       try {
          // UIKit-level API (if present)
          const ui = zego as any;
          if (typeof ui.setAudioOutputDevice === 'function') {
            // Some web implementations support selecting output devices.
            // We don't have a device list here; keep as best-effort and fall back to engine.
          }

         const engine = (zego as any).zegoExpressEngine;
         if (engine && typeof engine.setAudioRouteToSpeaker === 'function') {
           await engine.setAudioRouteToSpeaker(newSpeaker);
         }
       } catch (e) {
         console.warn('Failed to toggle speaker:', e);
       }
     }
     
     setState(prev => ({ ...prev, isSpeaker: newSpeaker }));
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
    if (element) {
       // Small delay to ensure ZEGO instance is fully ready
       setTimeout(() => {
         tryJoinRoom('container-ready');
       }, 100);
    }
  }, [tryJoinRoom]);

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
