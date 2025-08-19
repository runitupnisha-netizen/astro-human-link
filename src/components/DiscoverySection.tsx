import ProfileCard from "./ProfileCard";

const DiscoverySection = () => {
  const mockProfiles = [
    {
      name: "Luna",
      age: 28,
      zodiacSign: "Pisces",
      humanDesignType: "Manifestor",
      compatibility: 94,
      location: "San Francisco, CA"
    },
    {
      name: "Sage",
      age: 32,
      zodiacSign: "Scorpio", 
      humanDesignType: "Generator",
      compatibility: 87,
      location: "Austin, TX"
    },
    {
      name: "Aurora",
      age: 25,
      zodiacSign: "Aquarius",
      humanDesignType: "Projector", 
      compatibility: 78,
      location: "Portland, OR"
    },
    {
      name: "Phoenix",
      age: 30,
      zodiacSign: "Leo",
      humanDesignType: "Reflector",
      compatibility: 82,
      location: "Denver, CO"
    },
    {
      name: "River",
      age: 27,
      zodiacSign: "Cancer",
      humanDesignType: "Manifestor",
      compatibility: 91,
      location: "Sedona, AZ"
    },
    {
      name: "Star",
      age: 29,
      zodiacSign: "Gemini",
      humanDesignType: "Generator",
      compatibility: 76,
      location: "Asheville, NC"
    }
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-aurora bg-clip-text text-transparent">
            Discover Your Cosmic Matches
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            These souls have been aligned with your cosmic signature. Explore deep connections based on astrological harmony.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProfiles.map((profile, index) => (
            <ProfileCard key={index} {...profile} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default DiscoverySection;