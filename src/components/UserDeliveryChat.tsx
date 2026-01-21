import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, ArrowLeft, Phone, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import VoiceCallModal from "./VoiceCallModal";

interface Message {
  id: string;
  chat_id: string;
  sender_type: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface DeliveryPartner {
  id: string;
  name: string;
  mobile: string;
  profile_photo_url: string | null;
}

interface UserDeliveryChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  userId: string;
  userName?: string;
}

const UserDeliveryChat = ({
  open,
  onOpenChange,
  orderId,
  userId,
  userName = 'Customer',
}: UserDeliveryChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryPartner, setDeliveryPartner] = useState<DeliveryPartner | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Typing indicator
  const { isPartnerTyping, sendTyping } = useTypingIndicator({
    chatId,
    myType: 'user',
  });

  // Voice call - NO useIncomingCall here, GlobalVoiceCallContext handles it
  const voiceCall = useVoiceCall({
    chatId,
    myId: userId,
    myType: 'user',
    partnerId: deliveryPartner?.id || '',
    partnerName: deliveryPartner?.name || 'Delivery Partner',
  });

  // Find existing chat for this order
  const findChat = async () => {
    try {
      setLoading(true);
      
      // Find chat for this order
      const { data: chat, error: fetchError } = await supabase
        .from('delivery_customer_chats')
        .select(`
          id,
          delivery_partner_id,
          delivery_partners (
            id,
            name,
            mobile,
            profile_photo_url
          )
        `)
        .eq('order_id', orderId)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (chat) {
        setChatId(chat.id);
        setDeliveryPartner(chat.delivery_partners as unknown as DeliveryPartner);
        return chat.id;
      }

      // No chat exists yet - check if order has delivery partner assigned
      const { data: order } = await supabase
        .from('orders')
        .select('assigned_delivery_partner_id, delivery_partners(id, name, mobile, profile_photo_url)')
        .eq('id', orderId)
        .single();

      if (order?.assigned_delivery_partner_id) {
        setDeliveryPartner(order.delivery_partners as unknown as DeliveryPartner);
        
        // Create chat
        const { data: newChat, error: createError } = await supabase
          .from('delivery_customer_chats')
          .insert({
            order_id: orderId,
            delivery_partner_id: order.assigned_delivery_partner_id,
            user_id: userId,
          })
          .select('id')
          .single();

        if (createError) throw createError;

        setChatId(newChat.id);
        return newChat.id;
      }

      return null;
    } catch (error) {
      console.error('Error finding chat:', error);
      toast({
        title: "Error",
        description: "Failed to load chat",
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
      
      // Mark delivery partner messages as read
      const unreadIds = (data || [])
        .filter(m => m.sender_type === 'delivery_partner' && !m.read_at)
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
        sender_type: 'user',
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

  // Handle call button - pass partnerId and callerName to avoid empty receiver
  const handleCall = async () => {
    if (chatId && deliveryPartner) {
      // Request microphone first (user gesture)
      const micPromise = voiceCall.requestMicrophone?.();
      
      voiceCall.startCall({
        chatId,
        micPromise: micPromise ?? undefined,
        partnerId: deliveryPartner.id,
        callerName: userName,
      });
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
    if (open && orderId && userId) {
      findChat().then(chatIdResult => {
        if (chatIdResult) {
          fetchMessages(chatIdResult);
        }
      });
    }
  }, [open, orderId, userId]);

  // Subscribe to realtime messages and updates
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`user-chat-${chatId}`)
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
          
          // Mark delivery partner messages as read immediately
          if (newMsg.sender_type === 'delivery_partner' && !newMsg.read_at) {
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
        <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {deliveryPartner ? (
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={deliveryPartner.profile_photo_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {deliveryPartner.name?.charAt(0) || 'D'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{deliveryPartner.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {isPartnerTyping ? (
                      <span className="text-primary animate-pulse">typing...</span>
                    ) : (
                      'Delivery Partner'
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCall}
                  className="h-9 w-9 rounded-full"
                  title="Voice Call"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex-1">
                <h3 className="font-semibold">Chat with Delivery Partner</h3>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !deliveryPartner ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <p className="text-muted-foreground">No delivery partner assigned yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Chat will be available once a delivery partner is assigned
                </p>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                <div className="space-y-3 py-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No messages yet</p>
                      <p className="text-sm">Send a message to your delivery partner</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${
                          msg.sender_type === 'user'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        {msg.sender_type === 'delivery_partner' && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={deliveryPartner.profile_photo_url || ''} />
                            <AvatarFallback className="bg-muted">
                              {deliveryPartner.name?.charAt(0) || 'D'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-3 py-2 ${
                            msg.sender_type === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <div className={`flex items-center gap-1 mt-1 ${
                            msg.sender_type === 'user'
                              ? 'text-primary-foreground/70 justify-end'
                              : 'text-muted-foreground'
                          }`}>
                            <span className="text-xs">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                            {msg.sender_type === 'user' && !msg.id.startsWith('temp-') && (
                              msg.read_at ? (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </div>
                        {msg.sender_type === 'user' && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              U
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2 p-4 border-t bg-background">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={sending}
                  className="rounded-full"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={sending || !newMessage.trim()}
                  size="icon"
                  className="rounded-full h-10 w-10"
                >
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

      {/* Voice Call Modal - for calls initiated from this chat */}
      <VoiceCallModal
        open={voiceCall.state.status !== 'idle'}
        status={voiceCall.state.status}
        partnerName={
          voiceCall.state.callerType === 'delivery_partner' 
            ? 'Zippy Delivery Partner'
            : deliveryPartner?.name || 'Delivery Partner'
        }
        partnerAvatar={deliveryPartner?.profile_photo_url}
        showAvatar={voiceCall.state.callerType !== 'delivery_partner'}
        duration={voiceCall.state.duration}
        isMuted={voiceCall.state.isMuted}
        isSpeaker={voiceCall.state.isSpeaker}
        isIncoming={voiceCall.state.callerType === 'delivery_partner'}
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

export default UserDeliveryChat;
