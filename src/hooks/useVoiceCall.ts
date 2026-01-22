import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceCallState {
  status: 'idle' | 'calling' | 'ringing' | 'ongoing' | 'ended' | 'declined' | 'missed';
  callId: string | null;
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  callerType: 'user' | 'delivery_partner' | null;
}

interface UseVoiceCallProps {
  chatId: string | null;
  myId: string;
  myType: 'user' | 'delivery_partner';
  partnerId: string;
  partnerName: string;
}

export const useVoiceCall = ({
  chatId,
  myId,
  myType,
  partnerId,
  partnerName,
}: UseVoiceCallProps) => {
  const [state, setState] = useState<VoiceCallState>({
    status: 'idle',
    callId: null,
    duration: 0,
    isMuted: false,
    isSpeaker: false,
    callerType: null,
  });
  
  // Store pending offer in BOTH state and ref for reliability
  const [pendingOffer, setPendingOffer] = useState<{offer: RTCSessionDescriptionInit, callId: string} | null>(null);
  const pendingOfferRef = useRef<{offer: RTCSessionDescriptionInit, callId: string} | null>(null);
  
  const { toast } = useToast();
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const ringbackRef = useRef<HTMLAudioElement | null>(null);
  const missedCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preload audio on mount
  useEffect(() => {
    ringtoneRef.current = new Audio('/ringtone.mp3');
    ringtoneRef.current.preload = 'auto';
    ringtoneRef.current.loop = true;
    ringtoneRef.current.volume = 1.0;
    
    ringbackRef.current = new Audio('/ringtone.mp3');
    ringbackRef.current.preload = 'auto';
    ringbackRef.current.loop = true;
    ringbackRef.current.volume = 0.5;
    
    // Load audio files
    ringtoneRef.current.load();
    ringbackRef.current.load();
    
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
      if (ringbackRef.current) {
        ringbackRef.current.pause();
        ringbackRef.current = null;
      }
    };
  }, []);

  // Create peer connection with ICE servers
  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log('Sending ICE candidate');
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate.toJSON(),
            from: myId,
          },
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(console.error);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        stopRingtone();
        stopRingback();
        clearMissedCallTimeout();
        setState(prev => ({ ...prev, status: 'ongoing' }));
        startDurationTimer();
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall();
      }
    };

    return pc;
  }, [myId]);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    durationIntervalRef.current = setInterval(() => {
      setState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  }, []);

  // Play ringtone for receiver
  const playRingtone = useCallback(() => {
    console.log('playRingtone called');
    if (ringtoneRef.current) {
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current.play().catch(err => {
        console.error('Failed to play ringtone:', err);
      });
    }
  }, []);

  // Stop ringtone
  const stopRingtone = useCallback(() => {
    console.log('stopRingtone called');
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // Play ringback tone for caller
  const playRingback = useCallback(() => {
    console.log('playRingback called');
    if (ringbackRef.current) {
      ringbackRef.current.currentTime = 0;
      ringbackRef.current.play().catch(err => {
        console.error('Failed to play ringback:', err);
      });
    }
  }, []);

  // Stop ringback tone
  const stopRingback = useCallback(() => {
    console.log('stopRingback called');
    if (ringbackRef.current) {
      ringbackRef.current.pause();
      ringbackRef.current.currentTime = 0;
    }
  }, []);

  // Clear missed call timeout
  const clearMissedCallTimeout = useCallback(() => {
    if (missedCallTimeoutRef.current) {
      clearTimeout(missedCallTimeoutRef.current);
      missedCallTimeoutRef.current = null;
    }
  }, []);

  // Get user media
  const requestMicrophone = useCallback(() => {
    return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      localStreamRef.current = stream;
      return stream;
    }).catch((error) => {
      console.error('Error getting user media:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please allow microphone access.",
        variant: "destructive",
      });
      throw error;
    });
  }, [toast]);

  const getUserMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    return requestMicrophone();
  };

  // Initialize call - the caller initiates
  // NOTE: To avoid mobile "user gesture" issues, callers can pass a micPromise that was created
  // synchronously inside the button click handler.
  const startCall = useCallback(async (options?: { 
    chatId?: string | null; 
    micPromise?: Promise<MediaStream>;
    partnerId?: string;
    callerName?: string;
  }) => {
    const effectiveChatId = options?.chatId ?? chatId;
    const effectivePartnerId = options?.partnerId ?? partnerId;
    const effectiveCallerName = options?.callerName ?? (myType === 'delivery_partner' ? 'Zippy Delivery Partner' : 'Customer');

    if (!effectiveChatId) {
      toast({
        title: "Cannot Start Call",
        description: "Chat not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (!effectivePartnerId) {
      toast({
        title: "Cannot Start Call",
        description: "Receiver not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setState({ status: 'calling', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: myType });

      // IMPORTANT: request microphone access as early as possible.
      const stream = await (options?.micPromise ?? getUserMedia());

      // Create call record
      const { data: callData, error: callError } = await supabase
        .from('voice_calls')
        .insert({
          chat_id: effectiveChatId,
          caller_type: myType,
          caller_id: myId,
          receiver_id: effectivePartnerId,
          status: 'ringing',
        })
        .select('id')
        .single();

      if (callError) throw callError;

      const callId = callData.id;
      setState(prev => ({ ...prev, callId }));

      // Set up signaling channel - caller uses main channel
      const channel = supabase.channel(`call-${callId}`);
      channelRef.current = channel;

      // Also set up receiver channel for bidirectional offer sending
      const receiverChannel = supabase.channel(`call-${callId}-receiver`);

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create remote audio element
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }

      // Create offer upfront so we can resend it
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Function to send offer
      const sendOffer = (targetChannel: ReturnType<typeof supabase.channel>) => {
        console.log('Sending offer to receiver');
        targetChannel.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            offer: pc.localDescription,
            from: myId,
            callerName: effectiveCallerName,
            callId,
          },
        });
      };

      // Listen for events on main channel
      channel
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          console.log('Received answer');
          stopRingback(); // Stop ringback when call is answered
          if (payload.from !== myId && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));

            // Process pending candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from !== myId) {
            console.log('Received ICE candidate');
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              pendingCandidatesRef.current.push(payload.candidate);
            }
          }
        })
        .on('broadcast', { event: 'call-ringing' }, () => {
          // Partner's phone is ringing - update status and play ringback
          console.log('Partner phone is ringing');
          playRingback(); // Caller hears ringback tone
          setState(prev => ({ ...prev, status: 'ringing' }));
        })
        .on('broadcast', { event: 'call-declined' }, () => {
          console.log('Call declined');
          stopRingtone();
          stopRingback();
          clearMissedCallTimeout();
          setState(prev => ({ ...prev, status: 'declined' }));
          cleanup();
          receiverChannel.unsubscribe();

          // Reset after showing declined state
          setTimeout(() => {
            setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
          }, 2000);
        })
        .on('broadcast', { event: 'call-ended' }, () => {
          console.log('Call ended by partner');
          stopRingback();
          receiverChannel.unsubscribe();
          endCall();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Send offer immediately on main channel
            sendOffer(channel);

            // Auto-mark as missed after 30 seconds
            missedCallTimeoutRef.current = setTimeout(async () => {
              // Check current state at execution time
              setState(prev => {
                if (prev.status === 'calling' || prev.status === 'ringing') {
                  stopRingtone();
                  stopRingback();
                  cleanup();
                  receiverChannel.unsubscribe();

                  // Update call status in database
                  supabase
                    .from('voice_calls')
                    .update({ status: 'missed', ended_at: new Date().toISOString() })
                    .eq('id', callId)
                    .then(() => console.log('Call marked as missed'));

                  // Reset after showing missed state
                  setTimeout(() => {
                    setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
                  }, 2000);

                  return { ...prev, status: 'missed' as const };
                }
                return prev;
              });
            }, 30000);
          }
        });

      // Listen on receiver channel for receiver-ready event
      receiverChannel
        .on('broadcast', { event: 'receiver-ready' }, ({ payload }) => {
          console.log('Receiver is ready, resending offer');
          // Resend offer to receiver channel
          sendOffer(receiverChannel);
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          console.log('Received answer on receiver channel');
          stopRingback();
          if (payload.from !== myId && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));

            // Process pending candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from !== myId) {
            console.log('Received ICE candidate on receiver channel');
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              pendingCandidatesRef.current.push(payload.candidate);
            }
          }
        })
        .subscribe();

    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: "Could not start the call. Please try again.",
        variant: "destructive",
      });
      cleanup();
      setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
    }
  }, [chatId, createPeerConnection, getUserMedia, myId, myType, partnerId, partnerName, playRingback, stopRingback, stopRingtone, clearMissedCallTimeout, toast]);

  // Answer incoming call
  const answerCall = useCallback(async (callId: string, offer: RTCSessionDescriptionInit) => {
    try {
      console.log('answerCall: Starting to answer call', callId);
      stopRingtone();
      clearMissedCallTimeout();
      setState(prev => ({ ...prev, status: 'ongoing', callId }));

      // Get audio stream
      const stream = await getUserMedia();

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create remote audio element
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }

      // Set up signaling channel - use receiver channel for answering
      const channel = supabase.channel(`call-${callId}-receiver`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from !== myId) {
            console.log('Received ICE candidate');
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              pendingCandidatesRef.current.push(payload.candidate);
            }
          }
        })
        .on('broadcast', { event: 'call-ended' }, () => {
          console.log('Call ended by partner');
          endCall();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log('answerCall: Channel subscribed, setting remote description');
            // Set remote description and create answer
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Process pending candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log('answerCall: Sending answer');
            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: {
                answer: pc.localDescription,
                from: myId,
              },
            });

            // Also send to main channel for caller
            const mainChannel = supabase.channel(`call-${callId}`);
            mainChannel.subscribe((mainStatus) => {
              if (mainStatus === 'SUBSCRIBED') {
                mainChannel.send({
                  type: 'broadcast',
                  event: 'answer',
                  payload: {
                    answer: pc.localDescription,
                    from: myId,
                  },
                });
              }
            });

            // Update call status in database
            await supabase
              .from('voice_calls')
              .update({ status: 'ongoing', started_at: new Date().toISOString() })
              .eq('id', callId);
          }
        });

    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: "Call Failed",
        description: "Could not connect the call. Please try again.",
        variant: "destructive",
      });
      cleanup();
      setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
    }
  }, [createPeerConnection, getUserMedia, myId, stopRingtone, clearMissedCallTimeout, toast]);

  // Decline incoming call
  const declineCall = useCallback(async () => {
    console.log('declineCall called');
    stopRingtone();
    clearMissedCallTimeout();
    
    // Get call ID from state or pending offer (check both state and ref)
    const currentCallId = state.callId || pendingOffer?.callId || pendingOfferRef.current?.callId;
    console.log('declineCall: callId =', currentCallId);
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-declined',
        payload: { from: myId },
      });
    }

    if (currentCallId) {
      await supabase
        .from('voice_calls')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('id', currentCallId);
    }

  }, [state.callId, pendingOffer, myId, stopRingtone, clearMissedCallTimeout]);

  // End ongoing call
  const endCall = useCallback(async () => {
    console.log('endCall called');
    stopRingtone();
    stopRingback();
    clearMissedCallTimeout();
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { from: myId },
      });
    }

    // Use functional setState to get latest state
    setState(prev => {
      if (prev.callId && prev.status === 'ongoing') {
        supabase
          .from('voice_calls')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_seconds: prev.duration,
          })
          .eq('id', prev.callId)
          .then(() => console.log('Call ended and updated in DB'));
      } else if (prev.callId) {
        supabase
          .from('voice_calls')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', prev.callId)
          .then(() => console.log('Call ended and updated in DB'));
      }
      return { ...prev, status: 'ended' as const };
    });

    cleanup();
    
    // Reset to idle after showing ended state
    setTimeout(() => {
      setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
    }, 2000);
  }, [myId, stopRingtone, stopRingback, clearMissedCallTimeout]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    console.log('toggleMute called');
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    console.log('toggleSpeaker called');
    setState(prev => {
      const newIsSpeaker = !prev.isSpeaker;
      
      // Adjust audio output if available
      if (remoteAudioRef.current) {
        // On mobile, we can try to use setSinkId if available
        // For now, just adjust volume as a simple implementation
        remoteAudioRef.current.volume = newIsSpeaker ? 1.0 : 0.7;
      }
      
      return { ...prev, isSpeaker: newIsSpeaker };
    });
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    console.log('cleanup called');
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    pendingCandidatesRef.current = [];
  }, []);

  // Handle incoming call
  const handleIncomingCall = useCallback((callId: string, offer: RTCSessionDescriptionInit, callerName: string, callerType: 'user' | 'delivery_partner') => {
    if (state.status !== 'idle') {
      console.log('handleIncomingCall: Already in a call, ignoring');
      return;
    }
    
    console.log('handleIncomingCall triggered:', { callId, callerName, callerType });
    
    // Play ringtone
    playRingtone();
    
    // Store pending offer in BOTH state and ref for reliability
    const pending = { offer, callId };
    setPendingOffer(pending);
    pendingOfferRef.current = pending;
    
    // Update state
    setState({
      status: 'ringing',
      callId,
      duration: 0,
      isMuted: false,
      isSpeaker: false,
      callerType,
    });

    // Subscribe to main channel to send back ringing notification
    const channel = supabase.channel(`call-${callId}`);
    channelRef.current = channel;
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Sending call-ringing notification');
        channel.send({
          type: 'broadcast',
          event: 'call-ringing',
          payload: { from: myId },
        });
      }
    });
  }, [state.status, playRingtone, myId]);

  // Wrapper for answerCall that retrieves stored offer
  const answerCallWrapper = useCallback(() => {
    // Check BOTH state and ref for pending offer (state is more reliable)
    const pending = pendingOffer || pendingOfferRef.current;
    console.log('answerCallWrapper called, pending:', pending);
    
    if (pending) {
      answerCall(pending.callId, pending.offer);
      setPendingOffer(null);
      pendingOfferRef.current = null;
    } else {
      console.error('No pending call offer found');
      toast({
        title: "Call Error",
        description: "Could not answer call. Please try again.",
        variant: "destructive",
      });
    }
  }, [pendingOffer, answerCall, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      stopRingtone();
      stopRingback();
      clearMissedCallTimeout();
    };
  }, [cleanup, stopRingtone, stopRingback, clearMissedCallTimeout]);

  return {
    state,
    requestMicrophone,
    startCall,
    answerCall: answerCallWrapper,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    handleIncomingCall,
  };
};
