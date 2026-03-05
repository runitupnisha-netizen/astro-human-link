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
      humanDesignType: "Manifestor" as const,
      socialEnergy: "Introvert" as const,
      geneKey: { number: 64, name: "Confusion", gift: "Imagination" },
      compatibility: 94,
      location: "San Francisco, CA",
      interests: {
        music: ["Ambient", "Indie Folk"],
        movies: ["Sci-Fi", "Art House"],
        books: ["The Power of Now", "Women Who Run With Wolves"],
        sports: ["Yoga", "Swimming"],
        health: ["Plant-based", "Breathwork"],
        lifestyle: ["Meditation", "Minimalism"],
        thoughtSystems: ["Non-dualism", "Jungian Psychology"]
      }
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
      humanDesignType: "Generator" as const,
      socialEnergy: "Ambivert" as const,
      geneKey: { number: 18, name: "Correction", gift: "Healing" },
      compatibility: 87,
      location: "Austin, TX",
      interests: {
        music: ["Jazz", "Lo-fi Hip Hop"],
        movies: ["Documentary", "Thriller"],
        books: ["Maps of Meaning", "The Alchemist"],
        sports: ["Rock Climbing", "Trail Running"],
        health: ["Cold Therapy", "Intermittent Fasting"],
        lifestyle: ["Minimalism", "Biohacking"],
        thoughtSystems: ["Stoicism", "Systems Thinking"]
      }
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
      humanDesignType: "Projector" as const,
      socialEnergy: "Extrovert" as const,
      geneKey: { number: 41, name: "Contraction", gift: "Anticipation" },
      compatibility: 78,
      location: "Portland, OR",
      interests: {
        music: ["Electronic", "Synthwave"],
        movies: ["Cyberpunk", "Anime"],
        books: ["Neuromancer", "The Left Hand of Darkness"],
        sports: ["Parkour", "Skateboarding"],
        health: ["Biohacking", "Nootropics"],
        lifestyle: ["Digital Nomad", "Art Collecting"],
        thoughtSystems: ["Transhumanism", "Effective Altruism"]
      }
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
      humanDesignType: "Reflector" as const,
      socialEnergy: "Extrovert" as const,
      geneKey: { number: 30, name: "Recognition", gift: "Lightness" },
      compatibility: 82,
      location: "Denver, CO",
      interests: {
        music: ["Rock", "World Music"],
        movies: ["Adventure", "Fantasy"],
        books: ["Be Here Now", "The Hero with a Thousand Faces"],
        sports: ["Skydiving", "Cliff Diving", "Surfing"],
        health: ["CrossFit", "Carnivore Diet"],
        lifestyle: ["Adventure Travel", "Festival Culture"],
        thoughtSystems: ["Shamanism", "Sacred Geometry"]
      }
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
      humanDesignType: "Manifestor" as const,
      socialEnergy: "Introvert" as const,
      geneKey: { number: 6, name: "Conflict", gift: "Diplomacy" },
      compatibility: 91,
      location: "Sedona, AZ",
      interests: {
        music: ["Healing Frequencies", "Acoustic"],
        movies: ["Nature Docs", "Studio Ghibli"],
        books: ["The Celestine Prophecy", "A New Earth"],
        sports: ["Hiking", "Tai Chi"],
        health: ["Herbalism", "Forest Bathing"],
        lifestyle: ["Off-grid Living", "Crystal Healing"],
        thoughtSystems: ["Indigenous Wisdom", "Eco-Psychology"]
      }
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
      humanDesignType: "Generator" as const,
      socialEnergy: "Ambivert" as const,
      geneKey: { number: 57, name: "Intuitive Insight", gift: "Clarity" },
      compatibility: 76,
      location: "Asheville, NC",
      interests: {
        music: ["Indie Pop", "Reggae"],
        movies: ["Romance", "Indie Film"],
        books: ["Big Magic", "The Four Agreements"],
        sports: ["Bouldering", "Cycling"],
        health: ["Acupuncture", "Breathwork"],
        lifestyle: ["Community Living", "Sustainable Fashion"],
        thoughtSystems: ["Positive Psychology", "Social Innovation"]
      }
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
