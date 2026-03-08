import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import CosmicBackground from "@/components/CosmicBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <CosmicBackground />
      <div className="text-center relative z-10">
        <h1 className="text-5xl font-display bg-gradient-golden bg-clip-text text-transparent mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <a href="/" className="text-primary hover:text-primary/80 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
