import { motion } from "framer-motion";
import { Trophy, Lock, Star } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { useAchievements, Achievement } from "@/hooks/useAchievements";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import BackButton from "@/components/BackButton";

const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
  const progressPct = (achievement.progress / achievement.target) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-4 rounded-2xl border backdrop-blur-sm transition-all ${
        achievement.unlocked
          ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10"
          : "bg-card/50 border-border/50 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`text-3xl ${achievement.unlocked ? "" : "grayscale"}`}>
          {achievement.unlocked ? achievement.icon : "🔒"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm ${achievement.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
            {achievement.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
          {!achievement.unlocked && (
            <div className="mt-2">
              <Progress value={progressPct} className="h-1.5" />
              <span className="text-[10px] text-muted-foreground mt-1">
                {achievement.progress}/{achievement.target}
              </span>
            </div>
          )}
        </div>
        {achievement.unlocked && (
          <Star className="w-4 h-4 text-accent fill-accent shrink-0" />
        )}
      </div>
    </motion.div>
  );
};

const Achievements = () => {
  const { achievements, unlockedCount, totalCount } = useAchievements();
  const { t } = useTranslation();
  const categories = [
    { key: "all", label: "All" },
    { key: "profile", label: "Profile" },
    { key: "social", label: "Social" },
    { key: "cosmic", label: "Cosmic" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div data-back-button-injected className="absolute top-[calc(env(safe-area-inset-top,0px)+4rem)] left-2 z-40">
        <BackButton fallback="/profile" />
      </div>
      <CosmicBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 border border-accent/40 mb-3"
          >
            <Trophy className="w-8 h-8 text-accent" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">{t("achievements.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unlockedCount}/{totalCount} {t("achievements.unlocked")}
          </p>
          <Progress value={(unlockedCount / totalCount) * 100} className="mt-3 h-2" />
        </div>

        <Tabs defaultValue="all">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            {categories.map(c => (
              <TabsTrigger key={c.key} value={c.key} className="text-xs">{c.label}</TabsTrigger>
            ))}
          </TabsList>
          {categories.map(c => (
            <TabsContent key={c.key} value={c.key} className="space-y-3">
              {achievements
                .filter(a => c.key === "all" || a.category === c.key)
                .sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0))
                .map(a => (
                  <AchievementCard key={a.id} achievement={a} />
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Achievements;
