import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Star } from "lucide-react";
import cosmicHero from "@/assets/cosmic-hero.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${cosmicHero})` }}
      />
      <div className="absolute inset-0 bg-gradient-cosmic/60" />
      
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-aurora rounded-full blur-lg animate-pulse" />
            <div className="relative bg-card/10 backdrop-blur-sm rounded-full p-4 border border-accent/20">
              <Sparkles className="w-12 h-12 text-accent" />
            </div>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-aurora bg-clip-text text-transparent leading-tight">
          Cosmic Connections
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Discover your perfect match through the wisdom of astrology and human design. 
          Connect with souls aligned to your cosmic blueprint.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 shadow-glow px-8 py-4 text-lg font-medium"
          >
            <Heart className="w-5 h-5 mr-2" />
            Find Your Match
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            className="border-accent/30 hover:bg-accent/10 px-8 py-4 text-lg"
          >
            <Star className="w-5 h-5 mr-2" />
            Create Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-mystical rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Star className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Natal Chart Matching</h3>
            <p className="text-muted-foreground">Deep astrological compatibility based on your birth chart</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-mystical rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Human Design</h3>
            <p className="text-muted-foreground">Connect through your unique energetic blueprint</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-mystical rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Heart className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Soul Connections</h3>
            <p className="text-muted-foreground">Find relationships that align with your spiritual path</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;