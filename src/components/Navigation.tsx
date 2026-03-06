import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, User, MessageCircle, Settings, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import alignedLogo from "@/assets/aligned-hero-logo.png";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Discover", icon: Sparkles },
    { path: "/profile", label: "Your Blueprint", icon: User },
    { path: "/connections", label: "Soul Connections", icon: Heart },
    { path: "/messages", label: "Messages", icon: MessageCircle },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img src={alignedLogo} alt="Aligned" className="w-9 h-9 object-contain mix-blend-lighten" />
            <span className="font-display text-xl font-bold bg-gradient-aurora bg-clip-text text-transparent">
              Aligned
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className={isActive ? "bg-primary shadow-glow" : "hover:bg-secondary/20"}
                >
                  <Link to={item.path} className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="w-6 h-6 flex flex-col justify-center">
              <div className={`w-full h-0.5 bg-foreground transition-all ${isOpen ? 'rotate-45 translate-y-1' : ''}`} />
              <div className={`w-full h-0.5 bg-foreground mt-1 transition-all ${isOpen ? '-rotate-45 -translate-y-1' : ''}`} />
            </div>
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    asChild
                    className={`justify-start ${isActive ? "bg-primary shadow-glow" : "hover:bg-secondary/20"}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Link to={item.path} className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;