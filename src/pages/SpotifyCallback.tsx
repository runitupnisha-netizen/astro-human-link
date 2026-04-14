import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SpotifyCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      navigate("/settings?spotify_error=denied");
      return;
    }

    if (code) {
      // Redirect to settings with the code so SpotifyConnect can exchange it
      navigate(`/settings?spotify_code=${code}`);
    } else {
      navigate("/settings");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default SpotifyCallback;
