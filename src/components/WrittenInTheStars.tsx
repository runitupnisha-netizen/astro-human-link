import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface WrittenInTheStarsProps {
  myAvatar?: string | null;
  theirAvatar?: string | null;
}

const WrittenInTheStars = ({ myAvatar, theirAvatar }: WrittenInTheStarsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width = 300;
    const h = canvas.height = 200;

    // Generate random star positions
    const stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
    }));

    // Constellation points connecting the two "souls"
    const leftCenter = { x: 80, y: 100 };
    const rightCenter = { x: 220, y: 100 };
    const constellationPoints = [
      { x: leftCenter.x + 15, y: leftCenter.y - 20 },
      { x: 120, y: 60 },
      { x: 150, y: 85 },
      { x: 150, y: 115 },
      { x: 180, y: 140 },
      { x: rightCenter.x - 15, y: rightCenter.y + 20 },
    ];

    let frame = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw stars
      stars.forEach((s) => {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(s.twinkle + frame * 0.02));
        ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw constellation lines progressively
      const progress = Math.min(frame / 60, 1);
      const pointsToDraw = Math.floor(progress * constellationPoints.length);

      ctx.strokeStyle = "rgba(155, 135, 245, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      if (pointsToDraw > 0) {
        ctx.beginPath();
        ctx.moveTo(constellationPoints[0].x, constellationPoints[0].y);
        for (let i = 1; i <= pointsToDraw && i < constellationPoints.length; i++) {
          ctx.lineTo(constellationPoints[i].x, constellationPoints[i].y);
        }
        ctx.stroke();
      }

      // Draw constellation nodes
      ctx.setLineDash([]);
      for (let i = 0; i <= pointsToDraw && i < constellationPoints.length; i++) {
        const p = constellationPoints[i];
        ctx.fillStyle = "rgba(155, 135, 245, 0.9)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.fillStyle = "rgba(155, 135, 245, 0.15)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative w-[300px] h-[200px] mx-auto">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Left avatar */}
      <motion.div
        initial={{ scale: 0, x: -20 }}
        animate={{ scale: 1, x: 0 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="absolute left-[45px] top-[65px] w-[70px] h-[70px] rounded-full overflow-hidden border-2 border-accent/40 bg-gradient-mystical flex items-center justify-center"
      >
        {myAvatar ? (
          <img src={myAvatar} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="text-2xl">✨</span>
        )}
      </motion.div>
      {/* Right avatar */}
      <motion.div
        initial={{ scale: 0, x: 20 }}
        animate={{ scale: 1, x: 0 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="absolute right-[45px] top-[65px] w-[70px] h-[70px] rounded-full overflow-hidden border-2 border-primary/40 bg-gradient-mystical flex items-center justify-center"
      >
        {theirAvatar ? (
          <img src={theirAvatar} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="text-2xl">💫</span>
        )}
      </motion.div>
    </div>
  );
};

export default WrittenInTheStars;
