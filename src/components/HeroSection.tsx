import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Star } from "lucide-react";
import alignedHeroLogo from "@/assets/aligned-hero-logo.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Large logo as background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src={alignedHeroLogo} 
          alt="" 
          className="w-[90vw] md:w-[70vw] lg:w-[60vw] max-w-[900px] object-contain opacity-20 select-none pointer-events-none"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
      
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-aurora bg-clip-text text-transparent leading-tight">
          Find Your Person
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          Where ancient wisdom meets modern love. Connect with someone who truly sees and understands the real you—through the language of the stars and the blueprint of your soul.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 shadow-glow px-8 py-4 text-lg font-medium"
          >
            <Heart className="w-5 h-5 mr-2" />
            Start Your Soul Search
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            className="border-accent/30 hover:bg-accent/10 px-8 py-4 text-lg"
          >
            <Star className="w-5 h-5 mr-2" />
            Reveal Your Blueprint
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-mystical rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Star className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sacred Timing</h3>
            <p className="text-muted-foreground">Houses, aspects, and planetary placements reveal your deepest compatibility</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-mystical rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gene Keys Wisdom</h3>
            <p className="text-muted-foreground">Your shadow, gift, and genius pathways guide authentic connections</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-mystical rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Heart className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Beyond Surface</h3>
            <p className="text-muted-foreground">Real connection that honors your authentic self and growth journey</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
