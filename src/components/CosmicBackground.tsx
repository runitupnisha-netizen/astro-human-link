import { useEffect, useState } from "react";

const CosmicBackground = () => {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 3,
      }));
      setStars(newStars);
    };

    generateStars();
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-cosmic" />
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute w-1 h-1 bg-accent rounded-full animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              transform: `scale(${star.size})`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${2 + star.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CosmicBackground;