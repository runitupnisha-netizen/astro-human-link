import CosmicBackground from "@/components/CosmicBackground";
import HeroSection from "@/components/HeroSection";
import DiscoverySection from "@/components/DiscoverySection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      <CosmicBackground />
      <HeroSection />
      <DiscoverySection />
      <Footer />
    </div>
  );
};

export default Index;