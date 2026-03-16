import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Sun, Moon, Sunrise, Dna, Hash, Heart, Sparkles, User, MapPin, Navigation } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CosmicBackground from "@/components/CosmicBackground";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import PhotoGallery from "@/components/PhotoGallery";
import BioPrompts from "@/components/BioPrompts";
import UserActions from "@/components/UserActions";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useVerificationStatus } from "@/hooks/useVerification";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  sun_sign: string | null;
  moon_sign: string | null;
  rising_sign: string | null;
  human_design_type: string | null;
  human_design_strategy: string | null;
  human_design_authority: string | null;
  human_design_profile: string | null;
  human_design_summary: string | null;
  life_path_number: number | null;
  birthday_number: number | null;
  personal_year_number: number | null;
  numerology_summary: string | null;
  gene_keys_life_purpose: string | null;
  gene_keys_evolution: string | null;
  gene_keys_radiance: string | null;
  gene_keys_summary: string | null;
  astro_summary: string | null;
  compatibility_tags: string[] | null;
  interests: string[] | null;
  relationship_goal: string | null;
  spiritual_practice: string | null;
  growth_commitment: string | null;
  gender: string | null;
  birth_date: string | null;
  birth_place: string | null;
  current_city: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
}

const ViewProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const { isVerified } = useVerificationStatus(userId);

  // Haversine distance calculation
  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, sun_sign, moon_sign, rising_sign, human_design_type, human_design_strategy, human_design_authority, human_design_profile, human_design_summary, life_path_number, birthday_number, personal_year_number, numerology_summary, gene_keys_life_purpose, gene_keys_evolution, gene_keys_radiance, gene_keys_summary, astro_summary, compatibility_tags, interests, relationship_goal, spiritual_practice, growth_commitment, gender, birth_date, birth_place, current_city, current_latitude, current_longitude")
        .eq("user_id", userId)
        .maybeSingle();
      setProfile(data);

      // Calculate distance from current user
      if (user && data?.current_latitude && data?.current_longitude) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("current_latitude, current_longitude")
          .eq("user_id", user.id)
          .maybeSingle();
        if (myProfile?.current_latitude && myProfile?.current_longitude) {
          const dist = calcDistance(myProfile.current_latitude, myProfile.current_longitude, data.current_latitude, data.current_longitude);
          setDistanceKm(Math.round(dist));
        }
      }
      setLoading(false);
    };
    load();
  }, [userId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <p>Profile not found.</p>
      </div>
    );
  }

  const sections = [
    {
      title: "Astrology",
      icon: <Sun className="w-5 h-5 text-accent" />,
      items: [
        { label: "Sun Sign", value: profile.sun_sign },
        { label: "Moon Sign", value: profile.moon_sign },
        { label: "Rising Sign", value: profile.rising_sign },
      ],
      summary: profile.astro_summary,
    },
    {
      title: "Human Design",
      icon: <Dna className="w-5 h-5 text-primary" />,
      items: [
        { label: "Type", value: profile.human_design_type },
        { label: "Strategy", value: profile.human_design_strategy },
        { label: "Authority", value: profile.human_design_authority },
        { label: "Profile", value: profile.human_design_profile },
      ],
      summary: profile.human_design_summary,
    },
    {
      title: "Numerology",
      icon: <Hash className="w-5 h-5 text-accent" />,
      items: [
        { label: "Life Path", value: profile.life_path_number?.toString() },
        { label: "Birthday", value: profile.birthday_number?.toString() },
        { label: "Personal Year", value: profile.personal_year_number?.toString() },
      ],
      summary: profile.numerology_summary,
    },
    {
      title: "Gene Keys",
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      items: [
        { label: "Life Purpose", value: profile.gene_keys_life_purpose },
        { label: "Evolution", value: profile.gene_keys_evolution },
        { label: "Radiance", value: profile.gene_keys_radiance },
      ],
      summary: profile.gene_keys_summary,
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          {/* Back + Actions */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {userId && (
              <UserActions targetUserId={userId} targetName={profile.display_name || "User"} />
            )}
          </div>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-mystical flex items-center justify-center mx-auto mb-4 ring-4 ring-primary/20 overflow-hidden shadow-mystical">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-foreground" />
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-foreground">
                {profile.display_name || "Cosmic Soul"}
              </h1>
              {isVerified && <VerifiedBadge size="md" />}
              {profile.birth_date && (
                <span className="text-2xl text-muted-foreground font-medium">
                  {(() => {
                    const birth = new Date(profile.birth_date + "T12:00:00");
                    const today = new Date();
                    let age = today.getFullYear() - birth.getFullYear();
                    const m = today.getMonth() - birth.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                    return age;
                  })()}
                </span>
              )}
            </div>
            {(profile.current_city || profile.birth_place || distanceKm !== null) && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mb-1">
                {(profile.current_city || profile.birth_place) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {profile.current_city || profile.birth_place?.split(",")[0]}
                  </span>
                )}
                {distanceKm !== null && (
                  <span className="flex items-center gap-1 text-accent">
                    <Navigation className="w-3.5 h-3.5" /> {(() => { const mi = Math.round(distanceKm * 0.621371); return mi < 1 ? "< 1" : mi; })()} mi away
                  </span>
                )}
              </p>
            )}
            <div className="flex items-center justify-center gap-3 text-muted-foreground text-sm">
              {profile.sun_sign && <span>☉ {profile.sun_sign}</span>}
              {profile.moon_sign && <span>☽ {profile.moon_sign}</span>}
              {profile.rising_sign && <span>↑ {profile.rising_sign}</span>}
            </div>
          </motion.div>


          {userId && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6">
              <PhotoGallery userId={userId} editable={false} maxPhotos={9} columns={3} />
            </motion.div>
          )}

          {/* Bio Prompts */}
          {userId && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
              <BioPrompts userId={userId} editable={false} />
            </motion.div>
          )}

          {/* Quick Info */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {profile.relationship_goal && (
                <Badge variant="outline" className="border-accent/30 text-accent">
                  <Heart className="w-3 h-3 mr-1" /> {profile.relationship_goal}
                </Badge>
              )}
              {profile.spiritual_practice && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {profile.spiritual_practice}
                </Badge>
              )}
              {profile.growth_commitment && (
                <Badge variant="outline" className="border-accent/30 text-accent">
                  {profile.growth_commitment}
                </Badge>
              )}
              {profile.human_design_type && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {profile.human_design_type}
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
              <Card className="bg-card/70 backdrop-blur-sm border-border/40">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" /> Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, i) => (
                      <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-none text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Cosmic Sections */}
          <div className="space-y-4">
            {sections.map((section, i) => {
              const hasData = section.items.some((item) => item.value) || section.summary;
              if (!hasData) return null;
              return (
                <motion.div key={section.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                  <Card className="bg-card/70 backdrop-blur-sm border-border/40">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        {section.icon} {section.title}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {section.items.map((item) =>
                          item.value ? (
                            <div key={item.label}>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{item.label}</p>
                              <p className="text-sm font-medium text-foreground">{item.value}</p>
                            </div>
                          ) : null
                        )}
                      </div>
                      {section.summary && (
                        <p className="text-xs text-muted-foreground leading-relaxed italic border-t border-border/30 pt-3">
                          {section.summary}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Compatibility Tags */}
          {profile.compatibility_tags && profile.compatibility_tags.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6">
              <Card className="bg-card/70 backdrop-blur-sm border-border/40">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Cosmic Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.compatibility_tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="bg-accent/10 text-accent border-none text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewProfile;
