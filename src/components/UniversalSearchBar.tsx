import { useState } from "react";
import { Search, Mic, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { SearchResults } from "./SearchResults";
export const UniversalSearchBar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const handleVoiceSearch = () => {
    toast({
      title: "Voice Search",
      description: "Voice search feature coming soon!"
    });
  };
  const handleClearSearch = () => {
    setSearchQuery("");
  };
  return <div className="bg-background py-6 sticky top-16 z-50 border-b">
      <div className="container mx-auto px-4">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          
          {searchQuery && <button onClick={handleClearSearch} className="absolute right-14 top-1/2 transform -translate-y-1/2">
              <X className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>}
          <button onClick={handleVoiceSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <Mic className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
          </button>
          <SearchResults searchQuery={searchQuery} onClose={handleClearSearch} />
        </div>
      </div>
    </div>;
};