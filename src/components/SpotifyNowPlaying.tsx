import { useState, useEffect } from "react";
import { Music, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SpotifyTrack {
  name: string;
  artist: string;
  album?: string;
  image?: string;
  url?: string;
}

interface SpotifyNowPlayingProps {
  userId: string;
  compact?: boolean;
}

const SpotifyNowPlaying = ({ userId, compact = false }: SpotifyNowPlayingProps) => {
  const [nowPlaying, setNowPlaying] = useState<{ is_playing: boolean; track: SpotifyTrack | null } | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpotify = async () => {
      try {
        const { data: npData } = await supabase.functions.invoke("spotify-auth", {
          body: { action: "now_playing", user_id: userId },
        });

        if (!npData?.connected) {
          setConnected(false);
          setLoading(false);
          return;
        }

        setConnected(true);
        setNowPlaying({ is_playing: npData.is_playing, track: npData.track });

        const { data: topData } = await supabase.functions.invoke("spotify-auth", {
          body: { action: "top_tracks", user_id: userId },
        });
        if (topData?.tracks) setTopTracks(topData.tracks);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchSpotify();
    const interval = setInterval(fetchSpotify, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading || !connected) return null;

  if (compact) {
    if (!nowPlaying?.is_playing || !nowPlaying.track) return null;
    return (
      <a
        href={nowPlaying.track.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/30 text-xs text-[#1DB954] hover:bg-[#1DB954]/25 transition-all"
      >
        <Music className="w-3 h-3 animate-pulse" />
        <span className="truncate max-w-[150px]">
          {nowPlaying.track.name} — {nowPlaying.track.artist}
        </span>
      </a>
    );
  }

  return (
    <div className="space-y-3">
      {/* Now Playing */}
      {nowPlaying?.is_playing && nowPlaying.track && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/20">
          {nowPlaying.track.image && (
            <img src={nowPlaying.track.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[#1DB954] text-xs font-medium mb-0.5">
              <Music className="w-3 h-3 animate-pulse" />
              Now Playing
            </div>
            <p className="text-sm font-medium text-foreground truncate">{nowPlaying.track.name}</p>
            <p className="text-xs text-muted-foreground truncate">{nowPlaying.track.artist}</p>
          </div>
          {nowPlaying.track.url && (
            <a href={nowPlaying.track.url} target="_blank" rel="noopener noreferrer" className="text-[#1DB954] hover:text-[#1DB954]/80">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Top Tracks */}
      {topTracks.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Music className="w-3 h-3" /> Top Tracks
          </h4>
          <div className="space-y-2">
            {topTracks.map((track, i) => (
              <a
                key={i}
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                {track.image && (
                  <img src={track.image} alt="" className="w-8 h-8 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate group-hover:text-[#1DB954] transition-colors">{track.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyNowPlaying;
