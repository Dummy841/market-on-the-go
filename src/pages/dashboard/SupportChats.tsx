import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, X, MessageCircle, User, Package, MapPin, Phone, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { useChatNotificationSound } from "@/hooks/useChatNotificationSound";

interface Chat {
  id: string;
  user_id: string;
  user_name: string | null;
  user_mobile: string | null;
  order_id: string | null;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface OrderItem {
  item_name: string;
  quantity: number;
  franchise_price: number;
  seller_price: number;
}

interface OrderDetails {
  id: string;
  seller_name: string;
  status: string;
  total_amount: number;
  delivery_address: string;
  delivery_mobile: string | null;
  items: OrderItem[];
  created_at: string;
  payment_method: string;
  delivery_fee: number;
  platform_fee: number;
  gst_charges: number;
}

const SupportChats = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { playNotificationSound } = useChatNotificationSound();

  useEffect(() => {
    fetchChats();
    
    // Subscribe to new chats
    const channel = supabase
      .channel('admin_support_chats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_chats' },
        () => fetchChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selectedChat) {
      setOrderDetails(null);
      return;
    }

    loadMessages(selectedChat.id);
    
    // Fetch order details if chat has an order_id
    if (selectedChat.order_id) {
      fetchOrderDetails(selectedChat.order_id);
    } else {
      setOrderDetails(null);
    }

    // Subscribe to messages for selected chat
    const channel = supabase
      .channel(`admin_chat_messages_${selectedChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `chat_id=eq.${selectedChat.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Play notification sound for user messages (incoming to admin)
          if (newMsg.sender_type === 'user') {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('support_chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats((data || []) as Chat[]);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      // Parse items JSON
      const items = Array.isArray(data.items) ? data.items : [];
      setOrderDetails({
        ...data,
        items: items as unknown as OrderItem[],
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      setOrderDetails(null);
    }
  };

  const loadMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }
    setMessages((data || []) as Message[]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;

    const messageText = newMessage.trim();
    setSending(true);
    setNewMessage("");
    
    try {
      const { data, error } = await supabase.from('support_messages').insert({
        chat_id: selectedChat.id,
        sender_type: 'admin',
        message: messageText,
      }).select().single();

      if (error) throw error;
      
      // Add message to local state immediately
      if (data) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === data.id)) return prev;
          return [...prev, data as Message];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restore message on error
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const closeChat = async () => {
    if (!selectedChat) return;

    try {
      const { error } = await supabase
        .from('support_chats')
        .update({ status: 'closed' })
        .eq('id', selectedChat.id);

      if (error) throw error;
      
      toast({
        title: "Chat Closed",
        description: "The support chat has been closed",
      });
      
      setSelectedChat(null);
      fetchChats();
    } catch (error) {
      console.error('Error closing chat:', error);
      toast({
        title: "Error",
        description: "Failed to close chat",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredChats = chats.filter((chat) => chat.status === activeTab);
  
  const isImageMessage = (message: string) => message.startsWith('[Image]');
  const getImageUrl = (message: string) => message.replace('[Image] ', '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': case 'refunded': return 'bg-red-100 text-red-800';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-800';
      case 'packed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Support Chats</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Chat List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'open' | 'closed')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open">
                  Open ({chats.filter((c) => c.status === 'open').length})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({chats.filter((c) => c.status === 'closed').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-350px)]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredChats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No {activeTab} chats
                </div>
              ) : (
                <div className="divide-y">
                  {filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                        selectedChat?.id === chat.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {chat.user_name || 'Unknown User'}
                        </span>
                        <Badge variant={chat.status === 'open' ? 'default' : 'secondary'}>
                          {chat.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {chat.user_mobile}
                      </div>
                      {chat.order_id && (
                        <div className="text-xs text-muted-foreground font-medium text-primary">
                          Order: #{chat.order_id}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Messages + Order Details */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedChat ? (
            <>
              <CardHeader className="pb-3 flex-shrink-0 flex flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedChat.user_name || 'Unknown User'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedChat.user_mobile}
                    {selectedChat.order_id && ` • Order #${selectedChat.order_id}`}
                  </p>
                </div>
                {selectedChat.status === 'open' && (
                  <Button variant="destructive" size="sm" onClick={closeChat}>
                    <X className="h-4 w-4 mr-1" />
                    Close Chat
                  </Button>
                )}
              </CardHeader>

              {/* Order Details Card */}
              {orderDetails && (
                <div className="px-4 pb-3 flex-shrink-0">
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Order Details</span>
                        <Badge className={`text-xs ${getStatusColor(orderDetails.status)}`}>
                          {orderDetails.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-muted-foreground">Restaurant:</span>
                          <span className="ml-1 font-medium">{orderDetails.seller_name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-1 font-medium">₹{orderDetails.total_amount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Payment:</span>
                          <span className="ml-1">{orderDetails.payment_method}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{format(new Date(orderDetails.created_at), 'dd MMM, hh:mm a')}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="border-t pt-2 mt-2">
                        <span className="text-xs text-muted-foreground">Items:</span>
                        <div className="mt-1 space-y-1">
                          {orderDetails.items.map((item, idx) => (
                            <div key={idx} className="text-xs flex justify-between">
                              <span>{item.quantity}x {item.item_name}</span>
                              <span>₹{item.franchise_price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Info */}
                      <div className="border-t pt-2 mt-2 text-xs">
                        <div className="flex items-start gap-1 mb-1">
                          <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground line-clamp-2">{orderDetails.delivery_address}</span>
                        </div>
                        {orderDetails.delivery_mobile && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{orderDetails.delivery_mobile}</span>
                          </div>
                        )}
                      </div>

                      {/* Charges Breakdown */}
                      <div className="border-t pt-2 mt-2 grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                        <div>Delivery: ₹{orderDetails.delivery_fee}</div>
                        <div>Platform: ₹{orderDetails.platform_fee}</div>
                        <div>GST: ₹{orderDetails.gst_charges}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[calc(100vh-520px)] p-4" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No messages yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              msg.sender_type === 'admin'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {isImageMessage(msg.message) ? (
                              <img 
                                src={getImageUrl(msg.message)} 
                                alt="Shared image" 
                                className="max-w-full max-h-48 rounded cursor-pointer"
                                onClick={() => window.open(getImageUrl(msg.message), '_blank')}
                              />
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            )}
                            <p
                              className={`text-xs mt-1 ${
                                msg.sender_type === 'admin'
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {selectedChat.status === 'open' && (
                <div className="p-4 border-t flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SupportChats;
