import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, Check, CheckCheck, Phone, ArrowLeft, MapPin, Package, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useDeliveryPartnerZegoVoiceCall } from "@/contexts/DeliveryPartnerZegoVoiceCallContext";

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

const QUICK_ACTIONS = [
  { label: "I have arrived", icon: MapPin, message: "📍 I have arrived at your location. Please come to collect your order." },
  { label: "On my way", icon: Navigation, message: "🚴 I'm on my way to deliver your order. Please be ready." },
  { label: "Order picked up", icon: Package, message: "✅ I have picked up your order and heading to your location now." },
];

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
  const navigate = useNavigate();

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

  // Voice call - using context
  let voiceCall: ReturnType<typeof useDeliveryPartnerZegoVoiceCall> | null = null;
  try {
    voiceCall = useDeliveryPartnerZegoVoiceCall();
  } catch {
    // Context not available
  }

  // Get or create chat
  const getOrCreateChat = async () => {
    try {
      setLoading(true);
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
      toast({ title: "Error", description: "Failed to initialize chat", variant: "destructive" });
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

  // Send message (reusable for both typed and quick action)
  const sendMessageText = async (text: string, isQuickAction = false) => {
    if (!text.trim() || !chatId) return;

    try {
      setSending(true);

      const messageData = {
        chat_id: chatId,
        sender_type: 'delivery_partner',
        message: text.trim(),
      };

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        ...messageData,
        created_at: new Date().toISOString(),
        read_at: null,
      };
      setMessages(prev => [...prev, optimisticMessage]);
      if (!isQuickAction) setNewMessage("");

      const { error: insertError } = await supabase
        .from('delivery_customer_messages')
        .insert(messageData);

      if (insertError) throw insertError;

      // Send notification to user - quick actions get a special high-priority title
      const notifTitle = isQuickAction
        ? '🚴 Delivery Update'
        : 'Message from Delivery Partner';

      await supabase.from('user_notifications').insert({
        user_id: userId,
        title: notifTitle,
        message: `${deliveryPartnerName}: ${text.trim()}`,
        type: isQuickAction ? 'delivery_update' : 'chat',
        reference_id: orderId,
      });

      if (isQuickAction) {
        toast({ title: "Sent!", description: "Customer has been notified" });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = () => sendMessageText(newMessage);

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    sendMessageText(action.message, true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) sendTyping();
  };

  const handleCall = async () => {
    if (!chatId) {
      toast({ title: "Cannot Call", description: "Chat not ready.", variant: "destructive" });
      return;
    }
    if (!voiceCall) {
      toast({ title: "Cannot Call", description: "Voice call not available.", variant: "destructive" });
      return;
    }
    voiceCall.startCall({ receiverId: userId, receiverName: customerName, chatId });
    onOpenChange(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && orderId && deliveryPartnerId && userId) {
      getOrCreateChat().then(chatIdResult => {
        if (chatIdResult) fetchMessages(chatIdResult);
      });
    }
  }, [open, orderId, deliveryPartnerId, userId]);

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_customer_messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            const exists = prev.some(m => m.message === newMsg.message && m.sender_type === newMsg.sender_type && (m.id === newMsg.id || m.id.startsWith('temp-')));
            if (exists) {
              return prev.map(m => m.id.startsWith('temp-') && m.message === newMsg.message && m.sender_type === newMsg.sender_type ? newMsg : m);
            }
            return [...prev, newMsg];
          });
          if (newMsg.sender_type === 'user' && !newMsg.read_at) {
            await supabase.from('delivery_customer_messages').update({ read_at: new Date().toISOString() }).eq('id', newMsg.id);
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_customer_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">Chat with {customerName}</h2>
          {isPartnerTyping && (
            <p className="text-xs text-primary animate-pulse">Customer is typing...</p>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={handleCall} className="h-9 w-9 rounded-full">
          <Phone className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            disabled={sending || !chatId}
            onClick={() => handleQuickAction(action)}
            className="whitespace-nowrap text-xs gap-1.5 shrink-0"
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
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
                  className={`flex gap-2 ${msg.sender_type === 'delivery_partner' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender_type === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{customerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 ${msg.sender_type === 'delivery_partner' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-sm">{msg.message}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.sender_type === 'delivery_partner' ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'}`}>
                      <span className="text-xs">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                      {msg.sender_type === 'delivery_partner' && !msg.id.startsWith('temp-') && (
                        msg.read_at ? <CheckCheck className="h-3 w-3 text-blue-400" /> : <Check className="h-3 w-3" />
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
      )}

      {/* Input */}
      <div className="flex gap-2 p-4 border-t border-border bg-card">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={sending}
        />
        <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default DeliveryCustomerChat;
