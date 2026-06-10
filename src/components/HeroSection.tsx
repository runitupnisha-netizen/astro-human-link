import { Button } from "@/components/ui/button";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import stellaraHeroLogo from "@/assets/stellara-hero-logo.png";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="mix-blend-screen"
        >
          <img 
            src={stellaraHeroLogo} 
            alt="" 
            className="w-[85vw] md:w-[60vw] lg:w-[50vw] max-w-[800px] object-contain"
          />
        </motion.div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background pointer-events-none" />
      
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <motion.h1
          {...fadeUp(0.2)}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 text-gradient-aurora leading-[1.1]"
        >
          Your Cosmic Connection Awaits
        </motion.h1>
        
        <motion.p
          {...fadeUp(0.4)}
          className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed font-serif"
        >
          Where love aligns with the stars. Find meaningful connections through the ancient wisdom of Astrology, Human Design & Gene Keys.
        </motion.p>

        <motion.div {...fadeUp(0.6)} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <Button 
            size="lg" 
            onClick={() => navigate(user ? "/discover" : "/sign-in")}
            className="bg-primary hover:bg-primary/90 shadow-glow px-8 py-5 text-base font-medium rounded-2xl"
          >
            <Heart className="w-5 h-5 mr-2" />
            {user ? "Start Exploring" : "Get Started"}
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate(user ? "/profile" : "/sign-in")}
            className="border-accent/30 hover:bg-accent/10 px-8 py-5 text-base rounded-2xl"
          >
            <Star className="w-5 h-5 mr-2" />
            {user ? "See Your Profile" : "Sign In"}
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Star,
              title: "More Than a Zodiac Sign",
              desc: "We look at your full chart — houses, aspects, and placements — to find real compatibility",
              delay: 0.8,
            },
            {
              icon: Heart,
              title: "Personality First",
              desc: "Prompts, interests, and your unique blueprint make every profile worth reading",
              delay: 0.95,
            },
            {
              icon: Heart,
              title: "Intentional Connection",
              desc: "Less mindless scrolling, more meaningful connections with people who get you",
              delay: 1.1,
            },
          ].map(({ icon: Icon, title, desc, delay }) => (
            <motion.div key={title} {...fadeUp(delay)} className="text-center group">
              <div className="w-12 h-12 bg-gradient-mystical rounded-xl mx-auto mb-4 flex items-center justify-center shadow-mystical group-hover:shadow-glow transition-shadow duration-500">
                <Icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-base font-semibold mb-2 font-display">{title}</h3>
              <p className="text-sm text-muted-foreground font-serif leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
