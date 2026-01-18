import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, Check, CheckCheck, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { useIncomingCall } from "@/hooks/useIncomingCall";
import VoiceCallModal from "./VoiceCallModal";

interface Message {
  id: string;
  chat_id: string;
  sender_type: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface DeliveryCustomerChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  deliveryPartnerId: string;
  userId: string;
  deliveryPartnerName: string;
}

const DeliveryCustomerChat = ({
  open,
  onOpenChange,
  orderId,
  deliveryPartnerId,
  userId,
  deliveryPartnerName,
}: DeliveryCustomerChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState<string>('Customer');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch customer name
  useEffect(() => {
    const fetchCustomerName = async () => {
      if (!userId) return;
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();
      if (user?.name) {
        setCustomerName(user.name);
      }
    };
    fetchCustomerName();
  }, [userId]);

  // Typing indicator
  const { isPartnerTyping, sendTyping } = useTypingIndicator({
    chatId,
    myType: 'delivery_partner',
  });

  // Voice call
  const voiceCall = useVoiceCall({
    chatId,
    myId: deliveryPartnerId,
    myType: 'delivery_partner',
    partnerId: userId,
    partnerName: customerName,
  });

  // Listen for incoming calls
  useIncomingCall({
    chatId,
    myId: deliveryPartnerId,
    myType: 'delivery_partner',
    onIncomingCall: voiceCall.handleIncomingCall,
  });

  // Get or create chat
  const getOrCreateChat = async () => {
    try {
      setLoading(true);
      
      // Check if chat exists
      const { data: existingChat, error: fetchError } = await supabase
        .from('delivery_customer_chats')
        .select('id')
        .eq('order_id', orderId)
        .eq('delivery_partner_id', deliveryPartnerId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingChat) {
        setChatId(existingChat.id);
        return existingChat.id;
      }

      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('delivery_customer_chats')
        .insert({
          order_id: orderId,
          delivery_partner_id: deliveryPartnerId,
          user_id: userId,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      setChatId(newChat.id);
      return newChat.id;
    } catch (error) {
      console.error('Error getting/creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to initialize chat",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages
  const fetchMessages = async (chatIdToUse: string) => {
    try {
      const { data, error } = await supabase
        .from('delivery_customer_messages')
        .select('*')
        .eq('chat_id', chatIdToUse)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark user messages as read
      const unreadIds = (data || [])
        .filter(m => m.sender_type === 'user' && !m.read_at)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from('delivery_customer_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      setSending(true);
      
      const messageData = {
        chat_id: chatId,
        sender_type: 'delivery_partner',
        message: newMessage.trim(),
      };

      // Optimistically add message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        ...messageData,
        created_at: new Date().toISOString(),
        read_at: null,
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");

      const { error: insertError } = await supabase
        .from('delivery_customer_messages')
        .insert(messageData);

      if (insertError) throw insertError;

      // Send notification to user
      await supabase.from('user_notifications').insert({
        user_id: userId,
        title: 'Message from Delivery Partner',
        message: `${deliveryPartnerName}: ${newMessage.trim()}`,
        type: 'chat',
        reference_id: orderId,
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      sendTyping();
    }
  };

  // Handle call button
  const handleCall = () => {
    if (chatId) {
      voiceCall.startCall();
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize chat when modal opens
  useEffect(() => {
    if (open && orderId && deliveryPartnerId && userId) {
      getOrCreateChat().then(chatIdResult => {
        if (chatIdResult) {
          fetchMessages(chatIdResult);
        }
      });
    }
  }, [open, orderId, deliveryPartnerId, userId]);

  // Subscribe to realtime messages and updates
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_customer_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Don't add if it's our optimistic message
          setMessages(prev => {
            const exists = prev.some(m => 
              m.message === newMsg.message && 
              m.sender_type === newMsg.sender_type &&
              (m.id === newMsg.id || m.id.startsWith('temp-'))
            );
            if (exists) {
              return prev.map(m => 
                m.id.startsWith('temp-') && 
                m.message === newMsg.message && 
                m.sender_type === newMsg.sender_type
                  ? newMsg
                  : m
              );
            }
            return [...prev, newMsg];
          });
          
          // Mark user messages as read immediately
          if (newMsg.sender_type === 'user' && !newMsg.read_at) {
            await supabase
              .from('delivery_customer_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_customer_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle>Chat with Customer</DialogTitle>
                {isPartnerTyping && (
                  <p className="text-xs text-primary animate-pulse mt-1">Customer is typing...</p>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCall}
                className="h-9 w-9 rounded-full ml-2"
                title="Voice Call"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-3 py-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${
                          msg.sender_type === 'delivery_partner'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        {msg.sender_type === 'user' && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            msg.sender_type === 'delivery_partner'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <div className={`flex items-center gap-1 mt-1 ${
                            msg.sender_type === 'delivery_partner'
                              ? 'text-primary-foreground/70 justify-end'
                              : 'text-muted-foreground'
                          }`}>
                            <span className="text-xs">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                            {msg.sender_type === 'delivery_partner' && !msg.id.startsWith('temp-') && (
                              msg.read_at ? (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </div>
                        {msg.sender_type === 'delivery_partner' && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{deliveryPartnerName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={sending}
                />
                <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Voice Call Modal */}
      <VoiceCallModal
        open={voiceCall.state.status !== 'idle'}
        status={voiceCall.state.status}
        partnerName={customerName}
        partnerAvatar={null}
        duration={voiceCall.state.duration}
        isMuted={voiceCall.state.isMuted}
        isSpeaker={voiceCall.state.isSpeaker}
        isIncoming={voiceCall.state.callerType === 'user'}
        onAnswer={voiceCall.answerCall}
        onDecline={voiceCall.declineCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
        onToggleSpeaker={voiceCall.toggleSpeaker}
        onClose={() => {}}
      />
    </>
  );
};

export default DeliveryCustomerChat;
