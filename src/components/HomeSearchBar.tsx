import { useState, useEffect } from 'react';
import { Search, Mic, X, MicOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

interface HomeSearchBarProps {
  onSearch: (query: string) => void;
}

export const HomeSearchBar = ({ onSearch }: HomeSearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    isListening,
    isProcessing,
    transcript,
    searchResults,
    startListening,
    stopListening,
    isSupported,
  } = useVoiceSearch();

  // Update search query when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
    }
  }, [transcript]);

  // When voice search results come back, use keywords to search
  useEffect(() => {
    if (searchResults?.keywords?.length) {
      const searchTerm = searchResults.keywords.join(' ');
      setSearchQuery(searchTerm);
      onSearch(searchTerm);
    }
  }, [searchResults, onSearch]);

  // Debounced search - trigger parent callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  const handleVoiceClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="sticky top-0 z-[99] bg-background border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="relative">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search items, products, sellers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-20 h-12 rounded-full border-2"
          />
          
          {/* Clear and Voice buttons */}
          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {isSupported && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${isListening ? 'text-red-500 animate-pulse' : 'text-primary'}`}
                onClick={handleVoiceClick}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Listening indicator */}
        {isListening && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 z-50">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-75" />
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150" />
            </div>
            <span className="text-sm text-red-700">Listening... Speak now</span>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 z-50">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-blue-700">Processing voice search...</span>
          </div>
        )}
      </div>
    </div>
  );
};
