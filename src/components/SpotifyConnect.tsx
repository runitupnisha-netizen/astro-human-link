import { useState, useEffect } from "react";
import { Music, Unlink, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const SpotifyConnect = () => {
  const { user, session } = useAuth();
  const [connected, setConnected] = useState(false);
  const [spotifyName, setSpotifyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check if connected by trying now_playing
    supabase.functions
      .invoke("spotify-auth", { body: { action: "now_playing", user_id: user.id } })
      .then(({ data }) => {
        setConnected(!!data?.connected);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  // Handle callback code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("spotify_code");
    if (!code || !session?.access_token) return;

    const exchange = async () => {
      const redirectUri = `${window.location.origin}/callback/spotify`;
      const { data, error } = await supabase.functions.invoke("spotify-auth", {
        body: { action: "callback", code, redirect_uri: redirectUri },
      });
      if (error || !data?.success) {
        toast.error("Failed to connect Spotify");
      } else {
        toast.success(`Connected to Spotify as ${data.spotify_name} 🎵`);
        setConnected(true);
        setSpotifyName(data.spotify_name);
      }
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    };
    exchange();
  }, [session?.access_token]);

  const handleConnect = async () => {
    const redirectUri = `${window.location.origin}/callback/spotify`;
    const { data } = await supabase.functions.invoke("spotify-auth", {
      body: { action: "auth_url", redirect_uri: redirectUri },
    });
    if (data?.url) {
      window.location.href = data.url;
    } else {
      toast.error("Could not generate Spotify auth URL");
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await supabase.functions.invoke("spotify-auth", {
      body: { action: "disconnect" },
    });
    setConnected(false);
    setSpotifyName(null);
    setDisconnecting(false);
    toast.success("Spotify disconnected");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking Spotify...
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#1DB954]" />
          <span className="text-sm font-medium text-foreground">
            Spotify connected{spotifyName ? ` as ${spotifyName}` : ""}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-destructive hover:text-destructive/80"
        >
          {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      className="w-full bg-[#1DB954] hover:bg-[#1DB954]/90 text-white gap-2"
    >
      <Music className="w-4 h-4" />
      Connect Spotify
    </Button>
  );
};

export default SpotifyConnect;
