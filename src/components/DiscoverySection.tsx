import ProfileCard from "./ProfileCard";

const DiscoverySection = () => {
  const mockProfiles = [
    {
      name: "Luna",
      age: 28,
      zodiacSign: "Pisces",
      sunSign: "Pisces",
      moonSign: "Cancer",
      risingSign: "Scorpio",
      venusHouse: 7,
      marsAspect: "♂ ⚹ ♀",
      humanDesignType: "Manifestor",
      geneKey: { number: 64, name: "Confusion", gift: "Imagination" },
      compatibility: 94,
      location: "San Francisco, CA"
    },
    {
      name: "Sage",
      age: 32,
      zodiacSign: "Scorpio", 
      sunSign: "Scorpio",
      moonSign: "Virgo",
      risingSign: "Capricorn",
      venusHouse: 8,
      marsAspect: "♂ △ ☽",
      humanDesignType: "Generator",
      geneKey: { number: 18, name: "Correction", gift: "Healing" },
      compatibility: 87,
      location: "Austin, TX"
    },
    {
      name: "Aurora",
      age: 25,
      zodiacSign: "Aquarius",
      sunSign: "Aquarius",
      moonSign: "Gemini",
      risingSign: "Leo",
      venusHouse: 11,
      marsAspect: "♂ ☌ ♃",
      humanDesignType: "Projector", 
      geneKey: { number: 41, name: "Contraction", gift: "Anticipation" },
      compatibility: 78,
      location: "Portland, OR"
    },
    {
      name: "Phoenix",
      age: 30,
      zodiacSign: "Leo",
      sunSign: "Leo",
      moonSign: "Sagittarius",
      risingSign: "Aries",
      venusHouse: 5,
      marsAspect: "♂ □ ☿",
      humanDesignType: "Reflector",
      geneKey: { number: 30, name: "Recognition", gift: "Lightness" },
      compatibility: 82,
      location: "Denver, CO"
    },
    {
      name: "River",
      age: 27,
      zodiacSign: "Cancer",
      sunSign: "Cancer",
      moonSign: "Pisces",
      risingSign: "Taurus",
      venusHouse: 4,
      marsAspect: "♂ ⚹ ♆",
      humanDesignType: "Manifestor",
      geneKey: { number: 6, name: "Conflict", gift: "Diplomacy" },
      compatibility: 91,
      location: "Sedona, AZ"
    },
    {
      name: "Star",
      age: 29,
      zodiacSign: "Gemini",
      sunSign: "Gemini",
      moonSign: "Libra",
      risingSign: "Aquarius",
      venusHouse: 3,
      marsAspect: "♂ ⚺ ☉",
      humanDesignType: "Generator",
      geneKey: { number: 57, name: "Intuitive Insight", gift: "Clarity" },
      compatibility: 76,
      location: "Asheville, NC"
    }
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-aurora bg-clip-text text-transparent">
            Your Soul Tribe Awaits
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            These beautiful souls share a cosmic resonance with your unique blueprint. Each connection reveals the intricate dance of planets, houses, and Gene Keys that bind us together across time and space.
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