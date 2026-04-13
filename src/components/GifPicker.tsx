import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface GifResult {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const TRENDING_CATEGORIES = [
  { emoji: "😂", label: "Funny" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "👋", label: "Hello" },
  { emoji: "🥺", label: "Please" },
  { emoji: "💃", label: "Dance" },
  { emoji: "😘", label: "Kiss" },
  { emoji: "🎉", label: "Celebrate" },
];

const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-gifs", {
        body: { query, limit: 24 },
      });
      if (!error && data?.gifs) {
        setGifs(data.gifs);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, []);

  // Load trending on mount
  useEffect(() => {
    fetchGifs("");
  }, [fetchGifs]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(value);
    }, 400);
  }, [fetchGifs]);

  const handleCategoryClick = (label: string) => {
    setSearch(label);
    fetchGifs(label);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "min(70vh, 500px)" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-border overflow-hidden bg-card/95 backdrop-blur-sm"
    >
      <div className="p-3 sm:p-4 space-y-3 h-full flex flex-col">
        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search GIFs..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-10 text-sm bg-background/50 border-border"
              autoFocus
            />
          </div>
          <Button size="icon" variant="ghost" className="w-10 h-10 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Category chips */}
        {!search && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {TRENDING_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => handleCategoryClick(cat.label)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/40 hover:bg-muted/70 text-xs text-foreground whitespace-nowrap transition-colors"
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* GIF grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : gifs.length === 0 && hasSearched ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No GIFs found</p>
              <p className="text-xs">Try a different search</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {gifs.map((gif) => (
                <motion.button
                  key={gif.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelect(gif.url)}
                  className="relative rounded-lg overflow-hidden bg-muted/30 aspect-square"
                >
                  <img
                    src={gif.preview}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Tenor attribution */}
        <div className="text-center">
          <span className="text-[9px] text-muted-foreground/50">Powered by Tenor</span>
        </div>
      </div>
    </motion.div>
  );
};

export default GifPicker;
