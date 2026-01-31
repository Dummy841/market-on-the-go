import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VoiceSearchResult {
  keywords: string[];
  category?: string;
}

export const useVoiceSearch = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<VoiceSearchResult | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check if browser supports speech recognition
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-IN'; // English (India)

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        processVoiceQuery(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use voice search",
          variant: "destructive",
        });
      } else if (event.error === 'no-speech') {
        toast({
          title: "No speech detected",
          description: "Please try speaking again",
        });
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast({
        title: "Not supported",
        description: "Voice search is not supported in your browser",
        variant: "destructive",
      });
      return;
    }

    try {
      // Don't call getUserMedia - let SpeechRecognition handle its own mic access
      // This prevents the "Google cannot record" conflict error
      setTranscript('');
      setSearchResults(null);
      setIsListening(true);
      recognitionRef.current?.start();
    } catch (error) {
      console.error('Voice recognition error:', error);
      toast({
        title: "Voice search error",
        description: "Please try again",
        variant: "destructive",
      });
      setIsListening(false);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    recognitionRef.current?.stop();
  }, []);

  const processVoiceQuery = async (query: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('voice-search-products', {
        body: { query }
      });

      if (error) throw error;

      if (data?.keywords) {
        setSearchResults(data);
        return data;
      }
    } catch (error) {
      console.error('Error processing voice query:', error);
      // Fallback: use the transcript directly as search query
      setSearchResults({ keywords: query.split(' ').filter(w => w.length > 2) });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isListening,
    isProcessing,
    transcript,
    searchResults,
    startListening,
    stopListening,
    isSupported,
  };
};
