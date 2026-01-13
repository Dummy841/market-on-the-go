import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X, Image, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useChatNotificationSound } from "@/hooks/useChatNotificationSound";

interface Message {
  id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userMobile: string;
  orderId?: string | null;
}

export const SupportChatModal = ({
  isOpen,
  onClose,
  userId,
  userName,
  userMobile,
  orderId,
}: SupportChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { playNotificationSound } = useChatNotificationSound();

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    if (!chatId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`support_chat_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Play notification sound for admin messages (incoming)
          if (newMsg.sender_type === 'admin') {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeChat = async () => {
    setLoading(true);
    try {
      // Check for existing open chat for this specific order
      let existingChat = null;
      
      if (orderId) {
        const { data } = await supabase
          .from('support_chats')
          .select('*')
          .eq('user_id', userId)
          .eq('order_id', orderId)
          .eq('status', 'open')
          .maybeSingle();
        existingChat = data;
      } else {
        const { data } = await supabase
          .from('support_chats')
          .select('*')
          .eq('user_id', userId)
          .is('order_id', null)
          .eq('status', 'open')
          .maybeSingle();
        existingChat = data;
      }

      if (existingChat) {
        setChatId(existingChat.id);
        await loadMessages(existingChat.id);
      } else {
        // Create new chat
        const { data: newChat, error } = await supabase
          .from('support_chats')
          .insert({
            user_id: userId,
            user_name: userName,
            user_mobile: userMobile,
            order_id: orderId || null,
            status: 'open',
          })
          .select()
          .single();

        if (error) throw error;
        setChatId(newChat.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatIdToLoad: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatIdToLoad)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }
    setMessages((data || []) as Message[]);
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || newMessage.trim();
    if (!text || !chatId || sending) return;

    setSending(true);
    if (!messageText) setNewMessage("");
    
    try {
      const { data, error } = await supabase.from('support_messages').insert({
        chat_id: chatId,
        sender_type: 'user',
        message: text,
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
      if (!messageText) setNewMessage(text); // Restore message on error
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!chatId) return;
    
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${chatId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('seller-profiles')
        .upload(`support-chat/${fileName}`, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('seller-profiles')
        .getPublicUrl(`support-chat/${fileName}`);

      // Send the image URL as a message
      await sendMessage(`[Image] ${urlData.publicUrl}`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isImageMessage = (message: string) => message.startsWith('[Image]');
  const getImageUrl = (message: string) => message.replace('[Image] ', '');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Support Chat
              {orderId && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  Order #{orderId.slice(-6)}
                </span>
              )}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <p className="mb-2">Start a conversation</p>
              <p className="text-sm">Our team typically replies within a few minutes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.sender_type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {isImageMessage(msg.message) ? (
                      <img 
                        src={getImageUrl(msg.message)} 
                        alt="Shared image" 
                        className="max-w-full rounded cursor-pointer"
                        onClick={() => window.open(getImageUrl(msg.message), '_blank')}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender_type === 'user'
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

        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || sending}
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadingImage || sending}
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || uploadingImage}
              className="flex-1"
            />
            <Button onClick={() => sendMessage()} disabled={!newMessage.trim() || sending || uploadingImage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {uploadingImage && (
            <p className="text-xs text-muted-foreground text-center mt-2">Uploading image...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};