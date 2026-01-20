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
  
  const { toast } = useToast();
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const missedCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Play ringtone
  const playRingtone = useCallback(() => {
    if (!ringtoneRef.current) {
      ringtoneRef.current = new Audio('/ringtone.mp3');
      ringtoneRef.current.loop = true;
    }
    ringtoneRef.current.play().catch(console.error);
  }, []);

  // Stop ringtone
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
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
  const startCall = useCallback(async (options?: { chatId?: string | null; micPromise?: Promise<MediaStream> }) => {
    const effectiveChatId = options?.chatId ?? chatId;

    if (!effectiveChatId) {
      toast({
        title: "Cannot Start Call",
        description: "Chat not ready. Please try again.",
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
          receiver_id: partnerId,
          status: 'ringing',
        })
        .select('id')
        .single();

      if (callError) throw callError;

      const callId = callData.id;
      setState(prev => ({ ...prev, callId }));

      // Set up signaling channel
      const channel = supabase.channel(`call-${callId}`);
      channelRef.current = channel;

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

      // Listen for events
      channel
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          console.log('Received answer');
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
          // Partner's phone is ringing - update status
          console.log('Partner phone is ringing');
          setState(prev => ({ ...prev, status: 'ringing' }));
        })
        .on('broadcast', { event: 'call-declined' }, () => {
          console.log('Call declined');
          stopRingtone();
          clearMissedCallTimeout();
          setState(prev => ({ ...prev, status: 'declined' }));
          cleanup();

          // Reset after showing declined state
          setTimeout(() => {
            setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
          }, 2000);
        })
        .on('broadcast', { event: 'call-ended' }, () => {
          console.log('Call ended by partner');
          endCall();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Create and send offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channel.send({
              type: 'broadcast',
              event: 'offer',
              payload: {
                offer: pc.localDescription,
                from: myId,
                callerName: partnerName,
                callId,
              },
            });

            playRingtone();

            // Auto-mark as missed after 30 seconds
            missedCallTimeoutRef.current = setTimeout(async () => {
              // Use the latest state via functional setState patterns elsewhere; here we only guard by checking status value at execution time.
              if (state.status === 'calling' || state.status === 'ringing') {
                stopRingtone();
                cleanup();

                // Update call status in database
                await supabase
                  .from('voice_calls')
                  .update({ status: 'missed', ended_at: new Date().toISOString() })
                  .eq('id', callId);

                setState(prev => ({ ...prev, status: 'missed' }));

                // Reset after showing missed state
                setTimeout(() => {
                  setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
                }, 2000);
              }
            }, 30000);
          }
        });

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
  }, [chatId, createPeerConnection, getUserMedia, myId, myType, partnerId, partnerName, playRingtone, state.status, stopRingtone, clearMissedCallTimeout, toast]);

  // Answer incoming call
  const answerCall = async (callId: string, offer: RTCSessionDescriptionInit) => {
    try {
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

      // Set up signaling channel
      const channel = supabase.channel(`call-${callId}`);
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
            // Set remote description and create answer
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Process pending candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: {
                answer: pc.localDescription,
                from: myId,
              },
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
    }
  };

  // Decline incoming call
  const declineCall = async () => {
    stopRingtone();
    clearMissedCallTimeout();
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-declined',
        payload: { from: myId },
      });
    }

    if (state.callId) {
      await supabase
        .from('voice_calls')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('id', state.callId);
    }

    cleanup();
    setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
  };

  // End ongoing call
  const endCall = async () => {
    stopRingtone();
    clearMissedCallTimeout();
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { from: myId },
      });
    }

    if (state.callId && state.status === 'ongoing') {
      await supabase
        .from('voice_calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: state.duration,
        })
        .eq('id', state.callId);
    } else if (state.callId) {
      await supabase
        .from('voice_calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', state.callId);
    }

    cleanup();
    setState({ status: 'ended', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
    
    // Reset to idle after showing ended state
    setTimeout(() => {
      setState({ status: 'idle', callId: null, duration: 0, isMuted: false, isSpeaker: false, callerType: null });
    }, 2000);
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
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
  };

  // Cleanup
  const cleanup = () => {
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
  };

  // Handle incoming call
  const handleIncomingCall = useCallback((callId: string, offer: RTCSessionDescriptionInit, callerName: string, callerType: 'user' | 'delivery_partner') => {
    if (state.status !== 'idle') return; // Already in a call
    
    console.log('handleIncomingCall triggered:', { callId, callerName, callerType });
    
    playRingtone();
    setState({
      status: 'ringing',
      callId,
      duration: 0,
      isMuted: false,
      isSpeaker: false,
      callerType,
    });

    // Store offer for answering
    (window as any).__pendingCallOffer = offer;
    (window as any).__pendingCallId = callId;

    // Send back ringing notification to caller on the SAME channel they're listening on
    const channel = supabase.channel(`call-${callId}`);
    channelRef.current = channel;
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Sending call-ringing notification to caller on channel:', `call-${callId}`);
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
    const offer = (window as any).__pendingCallOffer;
    const callId = (window as any).__pendingCallId;
    console.log('answerCallWrapper called:', { hasOffer: !!offer, callId });
    if (offer && callId) {
      answerCall(callId, offer);
      delete (window as any).__pendingCallOffer;
      delete (window as any).__pendingCallId;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      stopRingtone();
      clearMissedCallTimeout();
    };
  }, []);

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
