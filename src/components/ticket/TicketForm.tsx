
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Upload, File, X } from 'lucide-react';

interface TicketFormProps {
  userType: 'farmer' | 'customer';
  userId: string;
  userName: string;
  userContact: string;
  onSubmit: (ticket: {
    user_id: string;
    user_type: string;
    user_name: string;
    user_contact: string;
    message: string;
    status: string;
    attachment_url?: string;
  }) => void;
  onCancel: () => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ 
  userType, 
  userId, 
  userName, 
  userContact, 
  onSubmit, 
  onCancel 
}) => {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAttachment(result);
        setAttachmentName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setAttachmentName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            // Convert speech to text (in a real app, this would use a speech recognition API)
            // For now, we'll just add a placeholder message
            const currentMessage = message ? message + ' ' : '';
            setMessage(currentMessage + '[Voice message transcription would appear here]');
            
            // Optionally, save the audio file as an attachment
            setAttachment(e.target.result as string);
            setAttachmentName('voice_message.webm');
          }
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Empty Message",
        description: "Please describe your issue before submitting",
        variant: "destructive"
      });
      return;
    }

    const newTicket = {
      user_id: userId,
      user_type: userType,
      user_name: userName,
      user_contact: userContact,
      message,
      status: 'pending',
      attachment_url: attachment || undefined
    };

    console.log('Submitting ticket:', newTicket);
    onSubmit(newTicket);
    
    // Reset form
    setMessage('');
    setAttachment(null);
    setAttachmentName('');
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Raise a Ticket</CardTitle>
        <CardDescription>
          Describe your issue and we'll get back to you as soon as possible
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <div className="relative">
              <Textarea 
                id="message" 
                placeholder="Describe your issue here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px]"
              />
              <Button
                type="button"
                size="sm"
                variant={isRecording ? "destructive" : "outline"}
                className="absolute bottom-2 right-2"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                {isRecording ? "Stop" : "Voice"}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="attachment">Attachment (Optional)</Label>
            {attachment ? (
              <div className="flex items-center p-2 border rounded-md">
                <File className="h-4 w-4 mr-2" />
                <span className="text-sm flex-grow truncate">{attachmentName}</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRemoveAttachment}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="h-6 w-6 mb-1" />
                    <span className="text-sm">Click to upload a file</span>
                  </div>
                </Button>
                <input
                  ref={fileInputRef}
                  id="attachment"
                  type="file"
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Submit Ticket
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TicketForm;
