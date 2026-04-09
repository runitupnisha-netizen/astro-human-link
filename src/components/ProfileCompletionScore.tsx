import { motion } from "framer-motion";

interface ProfileCompletionScoreProps {
  profile: any;
  photoCount: number;
}

const ProfileCompletionScore = ({ profile, photoCount }: ProfileCompletionScoreProps) => {
  const checks = [
    !!profile.avatar_url,
    !!(profile.birth_date && profile.birth_place),
    !!(profile.bio_prompt_1_answer && profile.bio_prompt_2_answer),
    photoCount >= 2,
    !!(profile.kids_preference && profile.drinking && profile.smoking),
    !!(profile.interests?.length >= 3),
  ];

  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "hsl(var(--accent))" : score >= 50 ? "hsl(var(--primary))" : "hsl(var(--destructive))";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="4" opacity={0.2} />
          <motion.circle
            cx="44" cy="44" r="42" fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <span className="text-sm font-bold text-foreground">{score}%</span>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Profile Score</p>
        <p className="text-[10px] text-muted-foreground">
          {score < 50 ? "Add more to stand out" : score < 80 ? "Looking good! Almost there" : "Your profile shines ✨"}
        </p>
      </div>
    </div>
  );
};

export default ProfileCompletionScore;
