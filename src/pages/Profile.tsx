import { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Star, Heart, Edit, MapPin, Calendar, Sparkles, Users, Zap, Dna, Hash, Wine, Cigarette, Pill, Baby, Loader2, Share2, Download, Info, RefreshCw, Eye, Trophy, Gift, ShieldCheck, ChevronRight, Settings, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CosmicBackground from "@/components/CosmicBackground";
import SoulBlueprintCard from "@/components/SoulBlueprintCard";
import zodiacWheel from "@/assets/zodiac-wheel.png";
import numerologyMandala from "@/assets/numerology-mandala.png";
import humanDesignBody from "@/assets/human-design-body.png";
import geneKeysHelix from "@/assets/gene-keys-helix.png";
import celestialDivider from "@/assets/celestial-divider.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AvatarUpload from "@/components/AvatarUpload";
import { Skeleton } from "@/components/ui/skeleton";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import PhotoGallery from "@/components/PhotoGallery";
import BioPrompts from "@/components/BioPrompts";
import ProfileChecklist from "@/components/ProfileChecklist";
import SelfieVerification from "@/components/SelfieVerification";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useVerificationStatus } from "@/hooks/useVerification";
import ProfilePreview from "@/components/ProfilePreview";
import ProfileCompletionScore from "@/components/ProfileCompletionScore";

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

const COSMIC_TAG_DESCRIPTIONS: Record<string, string> = {
  "Deep Thinker": "You process life through introspection and philosophical inquiry.",
  "Empath": "You naturally absorb and feel the emotions of those around you.",
  "Visionary": "You see possibilities others miss and dream of what could be.",
  "Healer": "You carry a natural gift for helping others restore balance.",
  "Old Soul": "You possess wisdom and depth beyond your years.",
  "Free Spirit": "You thrive on freedom, spontaneity, and authentic expression.",
  "Mystic": "You're drawn to the unseen realms and hidden truths of existence.",
  "Warrior": "You face challenges head-on with courage and determination.",
  "Nurturer": "You instinctively care for and support those in your circle.",
  "Creator": "You channel life force into art, ideas, and new realities.",
  "Seeker": "You're on a lifelong quest for truth, meaning, and growth.",
  "Leader": "You naturally inspire and guide others toward a shared vision.",
  "Rebel": "You challenge the status quo and forge your own path.",
  "Dreamer": "You live in the realm of imagination and infinite possibility.",
  "Philosopher": "You explore the big questions about life, meaning, and existence.",
  "Intuitive": "You trust your inner knowing and make heart-led decisions.",
  "Alchemist": "You transform challenges into wisdom and growth.",
  "Adventurer": "You seek new experiences and thrive on exploration.",
  "Peacemaker": "You harmonize conflict and create unity wherever you go.",
  "Teacher": "You share knowledge and uplift others through understanding.",
  "Lightworker": "You're here to raise the vibration of those around you.",
  "Manifester": "You bring ideas into reality with focused intention.",
  "Connector": "You build bridges between people and ideas effortlessly.",
  "Sage": "You offer grounded wisdom drawn from deep inner knowing.",
  "Transformer": "You catalyze change and evolution in yourself and others.",
};

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const blueprintRef = useRef<HTMLDivElement>(null);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editBirthTime, setEditBirthTime] = useState("");
  const [editBirthPlace, setEditBirthPlace] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const { isVerified } = useVerificationStatus(user?.id);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");

  const openEditDialog = () => {
    setEditBirthDate(profile?.birth_date || "");
    setEditBirthTime(profile?.birth_time?.slice(0, 5) || "");
    setEditBirthPlace(profile?.birth_place || "");
    setEditOpen(true);
  };

  const handleRegenerate = async () => {
    if (!editBirthDate || !editBirthPlace) {
      toast({ title: "Missing info", description: "Birth date and place are required.", variant: "destructive" });
      return;
    }
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cosmic-profile", {
        body: {
          birthDate: editBirthDate,
          birthTime: editBirthTime || null,
          birthPlace: editBirthPlace,
        },
      });
      if (error) throw error;

      // Refresh profile from DB
      const { data: refreshed } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (refreshed) setProfile(refreshed);

      setEditOpen(false);
      toast({ title: "Blueprint updated ✨", description: "Your profile has been refreshed with the new birth details." });
    } catch (err: any) {
      console.error("Regeneration error:", err);
      toast({ title: "Regeneration failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleShareBlueprint = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name || "My"} Soul Blueprint — Stellara`,
          text: `☉ ${profile?.sun_sign || "?"} · ☽ ${profile?.moon_sign || "?"} · ↗ ${profile?.rising_sign || "?"} | ${profile?.human_design_type || ""}`,
          url: window.location.href,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(
        `✨ My Soul Blueprint ✨\n☉ ${profile?.sun_sign || "?"} · ☽ ${profile?.moon_sign || "?"} · ↗ ${profile?.rising_sign || "?"}\n⚡ ${profile?.human_design_type || ""}\n🧬 ${profile?.gene_keys_life_purpose || ""}\n\n— Stellara`
      );
       toast({ title: "Copied to clipboard!", description: "Share your Soul Blueprint with the world ✨" });
    }
  };

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
    supabase
      .from("profile_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        setPhotoCount(count ?? 0);
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
      
      <div className="relative z-10 pt-24 pb-24 md:pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-4">
            <ProfileCompletionScore profile={profile} photoCount={photoCount} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-accent/30 gap-2 md:hidden" onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4" /> Settings
              </Button>
              <Button variant="outline" size="sm" className="border-primary/30 gap-2" onClick={() => setShowPreview(true)}>
                <Eye className="w-4 h-4" /> Preview
              </Button>
            </div>
          </div>
          <ProfileChecklist profile={profile} photoCount={photoCount} />

          {/* Explore More */}
          <div className="mb-8 grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[
              { label: "Premium", icon: Crown, path: "/premium" },
              { label: "Insights", icon: Star, path: "/insights" },
              { label: "Reveal", icon: Sparkles, path: "/reveal" },
              { label: "Achievements", icon: Trophy, path: "/achievements" },
              { label: "Referrals", icon: Gift, path: "/referral" },
              { label: "Astro Events", icon: Calendar, path: "/astro-events" },
              { label: "Safety", icon: ShieldCheck, path: "/safety" },
              { label: "Settings", icon: Settings, path: "/settings" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 px-2 py-3 transition-colors hover:bg-primary/10 hover:border-primary/30"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
          <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
            <CardContent className="p-8">
              <div className="flex flex-col items-center md:flex-row md:items-center gap-6">
                <AvatarUpload
                  userId={user!.id}
                  currentUrl={profile.avatar_url}
                  onUpload={(url) => setProfile({ ...profile, avatar_url: url })}
                  size="lg"
                />
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">{profile.display_name || "Your Profile"}</h1>
                    {isVerified && <VerifiedBadge size="lg" />}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-primary/30" onClick={() => { setEditDisplayName(profile.display_name || ""); setEditNameOpen(true); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Name
                      </Button>
                      <Button variant="outline" size="sm" className="border-accent/30" onClick={openEditDialog}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Birth Details
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center md:justify-start gap-4 text-muted-foreground mb-4">
                    {profile.current_city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-accent" />
                        <span>{profile.current_city}</span>
                      </div>
                    )}
                    {!profile.current_city && profile.birth_place && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.birth_place}</span>
                      </div>
                    )}
                    {profile.birth_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(profile.birth_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
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
                    {profile.birthday_number && (
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        Birthday #{profile.birthday_number}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Gallery */}
          <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-accent" />
                Photo Gallery
              </h2>
              <PhotoGallery userId={user!.id} editable={true} maxPhotos={9} columns={3} currentAvatarUrl={profile?.avatar_url} onAvatarChange={(url) => setProfile({ ...profile, avatar_url: url })} />
            </CardContent>
          </Card>

          {/* Photo Verification */}
          <div className="mb-8">
            <SelfieVerification />
          </div>

          {/* Bio Prompts */}
          <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-accent" />
                About You
              </h2>
              <BioPrompts userId={user!.id} editable={true} />
            </CardContent>
          </Card>

          {/* Current Location */}
          <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                Current Location
              </h2>
              <p className="text-sm text-muted-foreground mb-3">Where you live now — helps find people near you.</p>
              <LocationAutocomplete
                value={profile.current_city || ""}
                onChange={async (val, lat, lon) => {
                  if (lat && lon) {
                    const { error } = await supabase.from("profiles").update({
                      current_city: val,
                      current_latitude: lat,
                      current_longitude: lon,
                    }).eq("user_id", user!.id);
                    if (!error) {
                      setProfile({ ...profile, current_city: val, current_latitude: lat, current_longitude: lon });
                      toast({ title: "Location updated ✨" });
                    }
                  }
                }}
                placeholder="Search your current city…"
              />
              {profile.current_latitude && profile.current_longitude && (
                <div className="mt-4 rounded-xl overflow-hidden border border-border/50 shadow-lg">
                  <iframe
                    title="Current location map"
                    width="100%"
                    height="180"
                    style={{ border: 0, filter: "hue-rotate(220deg) saturate(0.6) brightness(0.85) contrast(1.1)" }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${profile.current_longitude - 0.05}%2C${profile.current_latitude - 0.03}%2C${profile.current_longitude + 0.05}%2C${profile.current_latitude + 0.03}&layer=mapnik&marker=${profile.current_latitude}%2C${profile.current_longitude}`}
                  />
                  <div className="bg-card/90 px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{profile.current_city}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {regenerating && (
            <Card className="mb-8 bg-card/80 backdrop-blur-sm border-primary/30 glow-border animate-fade-in">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <div>
                     <h3 className="text-lg font-semibold text-foreground">Updating Your Blueprint…</h3>
                     <p className="text-sm text-muted-foreground">Crunching the numbers with your new birth details</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-6 w-2/3 bg-primary/10" />
                      <Skeleton className="h-4 w-full bg-muted/50" />
                      <Skeleton className="h-4 w-5/6 bg-muted/50" />
                      <Skeleton className="h-20 w-full rounded-lg bg-muted/30" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-300 ${regenerating ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            {/* Astrological Profile */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border overflow-hidden relative">
              <div className="absolute top-3 right-3 w-16 h-16 opacity-15">
                <img src={zodiacWheel} alt="" className="w-full h-full object-contain" />
              </div>
              <CardContent className="p-6">
                 <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                   <Star className="w-5 h-5 text-accent" />
                   Your Star Chart
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
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border overflow-hidden relative">
              <div className="absolute top-3 right-3 w-14 h-20 opacity-10">
                <img src={humanDesignBody} alt="" className="w-full h-full object-contain" />
              </div>
              <CardContent className="p-6">
                 <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                   <Zap className="w-5 h-5 text-primary" />
                   Your Energy Profile
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div className="bg-background/40 rounded-lg p-3 border border-border/30">
                            <span className="text-muted-foreground">Strategy:</span>
                            <div className="font-medium mt-0.5">{profile.human_design_strategy || "—"}</div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">How you naturally move through the world and make things happen.</p>
                          </div>
                          <div className="bg-background/40 rounded-lg p-3 border border-border/30">
                            <span className="text-muted-foreground">Authority:</span>
                            <div className="font-medium mt-0.5">{profile.human_design_authority || "—"}</div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Your inner compass for decisions — the gut feeling you can trust most.</p>
                          </div>
                          <div className="bg-background/40 rounded-lg p-3 border border-border/30">
                            <span className="text-muted-foreground">Profile:</span>
                            <div className="font-medium mt-0.5">{profile.human_design_profile || "—"}</div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Your personality archetype — the role you naturally play in relationships.</p>
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
                      <div className="flex gap-3 mb-3">
                        <img src={geneKeysHelix} alt="" className="w-10 h-16 object-contain opacity-60 flex-shrink-0" />
                        <div className="bg-accent/10 rounded-lg p-4 border border-accent/20 space-y-3 text-sm flex-1">
                          <div className="bg-background/30 rounded-lg p-3 border border-border/20">
                            <span className="text-muted-foreground">Life Purpose:</span>
                            <div className="font-medium mt-0.5">{profile.gene_keys_life_purpose}</div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Your core theme — the challenge you're turning into a strength, and ultimately into your superpower.</p>
                          </div>
                          {profile.gene_keys_evolution && (
                            <div className="bg-background/30 rounded-lg p-3 border border-border/20">
                              <span className="text-muted-foreground">Evolution:</span>
                              <div className="font-medium mt-0.5">{profile.gene_keys_evolution}</div>
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Your growth edge in relationships — the key to deeper intimacy and emotional connection.</p>
                            </div>
                          )}
                          {profile.gene_keys_radiance && (
                            <div className="bg-background/30 rounded-lg p-3 border border-border/20">
                              <span className="text-muted-foreground">Radiance:</span>
                              <div className="font-medium mt-0.5">{profile.gene_keys_radiance}</div>
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Your natural magnetism — the quality that draws people to you.</p>
                            </div>
                          )}
                          {profile.gene_keys_summary && <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{profile.gene_keys_summary}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center my-6 opacity-30">
            <img src={celestialDivider} alt="" className="h-4 w-auto object-contain" />
          </div>

          {/* Soul Blueprint Card */}
          <Card className="mt-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 font-display">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Soul Blueprint Card
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-accent/30 text-accent hover:bg-accent/10"
                  onClick={handleShareBlueprint}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-4 font-serif">A snapshot of your profile you can share</p>
              <div ref={blueprintRef}>
                <SoulBlueprintCard profile={profile} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center my-6 opacity-30">
            <img src={celestialDivider} alt="" className="h-4 w-auto object-contain" />
          </div>

          {/* Numerology Section */}
          {profile.life_path_number && (
            <Card className="mt-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border overflow-hidden relative">
              <div className="absolute top-3 right-3 w-16 h-16 opacity-10">
                <img src={numerologyMandala} alt="" className="w-full h-full object-contain" />
              </div>
              <CardContent className="p-6">
                 <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                   <Hash className="w-5 h-5 text-accent" />
                   Your Numbers
                </h2>
                {(() => {
                  const KARMIC_DEBT: Record<number, string> = {
                    13: "Karmic Debt 13 — You're learning to overcome laziness and build discipline. Past-life shortcuts now demand honest effort and focus.",
                    14: "Karmic Debt 14 — A lesson in temperance. You're here to master freedom without excess, balancing adventure with responsibility.",
                    16: "Karmic Debt 16 — The Tower number. Ego dissolution leads to spiritual rebirth. Surrender opens the door to profound wisdom.",
                    19: "Karmic Debt 19 — A lesson in independence without isolation. Learning to lead with compassion rather than self-interest.",
                  };
                  const karmicNumbers = [13, 14, 16, 19];
                  const detectedKarmic = karmicNumbers.filter((k) =>
                    [profile.life_path_number, profile.birthday_number, profile.personal_year_number].includes(k)
                  );

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-4">
                        {[
                          {
                            label: "Life Path",
                            value: profile.life_path_number,
                            color: "accent",
                            desc: "Soul Mission",
                            detail: "Your life's core purpose and the lessons you're here to learn. This number shapes your deepest drives.",
                          },
                          {
                            label: "Birthday",
                            value: profile.birthday_number,
                            color: "primary",
                            desc: "Innate Gift",
                            detail: "A natural talent you were born with — your built-in edge in relationships and life.",
                          },
                          {
                            label: "Personal Year",
                            value: profile.personal_year_number,
                            color: "accent",
                            desc: "Current Cycle",
                            detail: "The energy of your current year (1–9). It tells you what to focus on right now.",
                          },
                        ].map((item) => (
                          <div key={item.label} className="text-center bg-muted/30 rounded-xl p-4 border border-border/40">
                            <div className={`w-14 h-14 mx-auto rounded-full bg-${item.color}/15 border border-${item.color}/30 flex items-center justify-center text-${item.color} font-bold text-xl mb-2`}>
                              {item.value || "—"}
                            </div>
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            <p className="text-[11px] text-accent font-medium mb-1">{item.desc}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                            {item.value && karmicNumbers.includes(item.value) && (
                              <span className="inline-block mt-2 text-[10px] font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2.5 py-0.5">
                                ⚡ Karmic Debt {item.value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {detectedKarmic.length > 0 && (
                        <div className="mb-4 bg-destructive/5 border border-destructive/15 rounded-xl p-4 space-y-3">
                          <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                            ⚡ Karmic Debt Detected
                          </h3>
                          {detectedKarmic.map((k) => (
                            <p key={k} className="text-xs text-muted-foreground leading-relaxed">
                              {KARMIC_DEBT[k]}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center my-6 opacity-30">
            <img src={celestialDivider} alt="" className="h-4 w-auto object-contain" />
          </div>

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

          <div className="flex justify-center my-6 opacity-30">
            <img src={celestialDivider} alt="" className="h-4 w-auto object-contain" />
          </div>

          {/* Compatibility Tags */}
          {profile.compatibility_tags && profile.compatibility_tags.length > 0 && (
            <Card className="mt-8 bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardContent className="p-6">
                 <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                   <Sparkles className="w-5 h-5 text-accent" />
                   Your Tags
                </h2>
                <p className="text-xs text-muted-foreground mb-4">Tap a tag to learn what it means</p>
                <div className="flex flex-wrap gap-2">
                  {profile.compatibility_tags.map((tag: string) => (
                    <button
                      key={tag}
                      onClick={() => setExpandedTag(expandedTag === tag ? null : tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        expandedTag === tag
                          ? "bg-accent/30 text-accent border-accent/50 ring-1 ring-accent/30"
                          : "bg-accent/10 text-accent border-accent/30 hover:bg-accent/20"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {expandedTag && (
                  <div className="mt-3 bg-accent/5 border border-border/50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-accent">{expandedTag}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                          {COSMIC_TAG_DESCRIPTIONS[expandedTag] || "A unique cosmic quality that shapes your energetic signature."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Birth Details Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Update Birth Details</DialogTitle>
            <DialogDescription>
              Changing your birth info will regenerate your entire profile — astrology, human design, gene keys, and numerology.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-birth-date">Birth Date *</Label>
              <Input
                id="edit-birth-date"
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-birth-time">Birth Time <span className="text-muted-foreground text-xs">(optional, improves accuracy)</span></Label>
              <Input
                id="edit-birth-time"
                type="time"
                value={editBirthTime}
                onChange={(e) => setEditBirthTime(e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-birth-place">Birth Place *</Label>
              <LocationAutocomplete
                id="edit-birth-place"
                value={editBirthPlace}
                onChange={(value) => setEditBirthPlace(value)}
                placeholder="e.g. Louisville, Kentucky"
                showGpsButton={false}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={regenerating}>
              Cancel
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={regenerating || !editBirthDate || !editBirthPlace}
              style={{ background: "var(--gradient-aurora)" }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Blueprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              ⚠️ Overwrite Current Blueprint?
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-2">
              This will <span className="text-foreground font-medium">permanently replace</span> your current profile — including your astrology, human design, gene keys, numerology, and compatibility tags — with a freshly generated one based on the new birth details.
              <br /><br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={regenerating}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                handleRegenerate();
              }}
              disabled={regenerating}
            >
              {regenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating…
                </>
              ) : (
                "Yes, Regenerate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfilePreview open={showPreview} onClose={() => setShowPreview(false)} profile={profile} />
    </div>
  );
};

export default Profile;
