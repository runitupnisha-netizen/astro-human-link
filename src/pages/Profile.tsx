import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, Heart, Edit, MapPin, Calendar, Sparkles, Users, Zap, Dna, Hash, Wine, Cigarette, Pill, Baby, Loader2 } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AvatarUpload from "@/components/AvatarUpload";

const LIFESTYLE_LABELS: Record<string, Record<string, string>> = {
  kids_preference: {
    want_kids: "👶 Want kids",
    have_kids: "👨‍👧 Have kids",
    open_to_kids: "🤔 Open to kids",
    dont_want_kids: "🚫 Don't want kids",
    not_sure: "🤷 Not sure yet",
    decline: "🔒 Prefer not to say",
  },
  drinking: {
    never: "🚫 Never",
    rarely: "🥂 Rarely",
    socially: "🍷 Socially",
    regularly: "🍺 Regularly",
    sober: "💪 Sober",
    decline: "🔒 Prefer not to say",
  },
  smoking: {
    never: "🚫 Never",
    occasionally: "💨 Occasionally",
    regularly: "🚬 Regularly",
    trying_to_quit: "🌱 Trying to quit",
    decline: "🔒 Prefer not to say",
  },
  substances: {
    never: "🚫 Never",
    occasionally: "🍃 Occasionally",
    plant_medicine: "🌿 Plant medicine only",
    microdosing: "🔬 Microdosing",
    open_minded: "🧠 Open-minded",
    decline: "🔒 Prefer not to say",
  },
};

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const socialLabel = (e: number | null) => {
    if (!e) return "Balanced";
    if (e <= 3) return "🌙 Introvert";
    if (e >= 8) return "☀️ Extrovert";
    return "🌗 Ambivert";
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      
      <div className="relative z-10 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Profile Header */}
          <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <AvatarUpload
                  userId={user!.id}
                  currentUrl={profile.avatar_url}
                  onUpload={(url) => setProfile({ ...profile, avatar_url: url })}
                  size="lg"
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">{profile.display_name || "Your Cosmic Blueprint"}</h1>
                    <Button variant="outline" size="sm" className="border-accent/30">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4 text-muted-foreground mb-4">
                    {profile.birth_place && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.birth_place}</span>
                      </div>
                    )}
                    {profile.birth_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(profile.birth_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.sun_sign && (
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        ☉ {profile.sun_sign}
                      </Badge>
                    )}
                    {profile.human_design_type && (
                      <Badge variant="secondary" className="bg-accent/20 text-accent">
                        {socialLabel(profile.social_energy)} • {profile.human_design_type}
                      </Badge>
                    )}
                    {profile.life_path_number && (
                      <Badge variant="outline" className="border-accent/30 text-accent">
                        Life Path {profile.life_path_number}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Astrological Profile */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent" />
                  Your Celestial Signature
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { symbol: "☉", label: "Sun", value: profile.sun_sign },
                      { symbol: "☽", label: "Moon", value: profile.moon_sign },
                      { symbol: "↗", label: "Rising", value: profile.rising_sign },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <div className="text-2xl font-bold text-primary">{item.symbol}</div>
                        <div className="text-sm text-muted-foreground">{item.label}</div>
                        <div className="font-medium">{item.value || "—"}</div>
                      </div>
                    ))}
                  </div>
                  {profile.astro_summary && (
                    <>
                      <Separator />
                      <p className="text-sm text-muted-foreground leading-relaxed">{profile.astro_summary}</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Human Design & Gene Keys */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Your Energetic Blueprint
                </h2>
                <div className="space-y-6">
                  {profile.human_design_type && (
                    <div>
                      <h3 className="font-medium mb-3">Human Design</h3>
                      <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                        <div className="text-lg font-semibold text-primary mb-2">{profile.human_design_type}</div>
                        {profile.human_design_summary && (
                          <p className="text-sm text-muted-foreground mb-3">{profile.human_design_summary}</p>
                        )}
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Strategy:</span>
                            <div className="font-medium">{profile.human_design_strategy || "—"}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Authority:</span>
                            <div className="font-medium">{profile.human_design_authority || "—"}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Profile:</span>
                            <div className="font-medium">{profile.human_design_profile || "—"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.gene_keys_life_purpose && (
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Dna className="w-4 h-4 text-accent" /> Gene Keys
                      </h3>
                      <div className="bg-accent/10 rounded-lg p-4 border border-accent/20 space-y-2 text-sm">
                        <div><span className="text-muted-foreground">Life Purpose:</span> <span className="ml-1">{profile.gene_keys_life_purpose}</span></div>
                        {profile.gene_keys_evolution && <div><span className="text-muted-foreground">Evolution:</span> <span className="ml-1">{profile.gene_keys_evolution}</span></div>}
                        {profile.gene_keys_radiance && <div><span className="text-muted-foreground">Radiance:</span> <span className="ml-1">{profile.gene_keys_radiance}</span></div>}
                        {profile.gene_keys_summary && <p className="text-muted-foreground mt-2">{profile.gene_keys_summary}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lifestyle Preferences */}
          {(profile.kids_preference || profile.drinking || profile.smoking || profile.substances) && (
            <Card className="mt-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-accent" />
                  Lifestyle
                  <Badge variant="outline" className="border-accent/30 text-accent text-xs ml-auto">Judgment-Free Zone 🕊️</Badge>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Baby, label: "Kids", field: "kids_preference" },
                    { icon: Wine, label: "Drinking", field: "drinking" },
                    { icon: Cigarette, label: "Smoking", field: "smoking" },
                    { icon: Pill, label: "Substances", field: "substances" },
                  ].map(({ icon: Icon, label, field }) => {
                    const value = profile[field];
                    if (!value || value === "decline") return null;
                    return (
                      <div key={field} className="bg-muted/30 rounded-xl p-4 text-center">
                        <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-sm font-medium text-foreground">
                          {LIFESTYLE_LABELS[field]?.[value]?.replace(/^[^\s]+\s/, "") || value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <Card className="mt-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Interests
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string) => (
                    <Badge key={interest} variant="secondary" className="bg-primary/15 text-primary border border-primary/20">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compatibility Tags */}
          {profile.compatibility_tags && profile.compatibility_tags.length > 0 && (
            <Card className="mt-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Cosmic Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.compatibility_tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="border-accent/30 text-accent">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
