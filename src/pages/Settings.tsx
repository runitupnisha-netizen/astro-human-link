import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Settings as SettingsIcon, Bell, Heart, Shield, Star, Moon, Sun, Smartphone, Trash2, Loader2, LogOut, PauseCircle, MessageSquare, Megaphone, Mail, Globe, Sparkles, Trophy, Gift, ShieldCheck, Calendar, ChevronRight, Eye, Music, Accessibility, Zap, Contrast, Database, Crown, FileText, BookOpen, ScrollText } from "lucide-react";
import { useTranslation, Language } from "@/hooks/useTranslation";
import CosmicBackground from "@/components/CosmicBackground";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getBriefingCacheCount, clearBriefingCache } from "@/hooks/useDailyBriefing";
import { toast } from "sonner";
import SpotifyConnect from "@/components/SpotifyConnect";
import SelfieVerification from "@/components/SelfieVerification";
import { hasSkippedVerification, clearVerificationSkip } from "@/hooks/useVerificationGate";
import { useAccessibility } from "@/hooks/useAccessibility";
import { usePremium } from "@/hooks/usePremium";

const APP_VERSION = "1.0.0";

const LanguageCard = () => {
  const { language, setLanguage, languages } = useTranslation();
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Language
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(languages) as [Language, string][]).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                language === code
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-card/50 border-border/50 text-muted-foreground hover:border-primary/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const BriefingCacheRow = () => {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(() =>
    user ? getBriefingCacheCount(user.id) : 0
  );

  // Recompute when the auth user changes (e.g. on first render after login).
  useEffect(() => {
    setCount(user ? getBriefingCacheCount(user.id) : 0);
  }, [user]);

  const handleClear = () => {
    if (!user) return;
    clearBriefingCache(user.id);
    setCount(0);
    toast.success("Cached briefings cleared");
  };

  const dayLabel = count === 1 ? "day" : "days";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" /> Cached Daily Briefings
        </span>
        <p className="text-sm text-muted-foreground">
          {count === 0
            ? "Nothing cached yet — your briefing will be saved here for offline use."
            : `${count} ${dayLabel} stored locally for offline access.`}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-primary/30 text-primary hover:bg-primary/10 shrink-0"
        onClick={handleClear}
        disabled={count === 0}
      >
        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
      </Button>
    </div>
  );
};

const AccessibilityCard = () => {
  const {
    reducedMotion,
    highContrast,
    systemReducedMotion,
    setReducedMotion,
    setHighContrast,
  } = useAccessibility();

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Accessibility className="w-5 h-5 text-primary" />
          Accessibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <span className="font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Reduced motion
            </span>
            <p className="text-sm text-muted-foreground mt-0.5">
              Disables expand/collapse animations, page transitions and hover effects.
              {systemReducedMotion && (
                <span className="block text-[11px] text-accent mt-1">
                  Your device already requests reduced motion — this is on by default.
                </span>
              )}
            </p>
          </div>
          <Switch
            checked={reducedMotion || systemReducedMotion}
            disabled={systemReducedMotion}
            onCheckedChange={(v) => setReducedMotion(v)}
            aria-label="Toggle reduced motion"
          />
        </div>

        <Separator className="bg-border/40" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <span className="font-medium flex items-center gap-2">
              <Contrast className="w-4 h-4 text-primary" /> High contrast
            </span>
            <p className="text-sm text-muted-foreground mt-0.5">
              Removes glassy translucency, strengthens borders and boosts text contrast for easier reading.
            </p>
          </div>
          <Switch
            checked={highContrast}
            onCheckedChange={(v) => setHighContrast(v)}
            aria-label="Toggle high contrast"
          />
        </div>
      </CardContent>
    </Card>
  );
};

const Settings = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isSupported, permission, subscribe } = usePushNotifications();
  const { subscribed: isPro, manageSubscription, refreshSubscription } = usePremium();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  // Daily Cosmic Briefing reminder prefs (server-stored)
  const [briefingPrefs, setBriefingPrefs] = useState({
    email: false,
    push: false,
    hour: 8,
    timezone: typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC",
  });
  const [savingBriefing, setSavingBriefing] = useState(false);

  const defaultNotifPrefs = { matches: true, messages: true, likes: true, insights: true, marketing: false };
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem("stellara-notif-prefs");
      return stored ? { ...defaultNotifPrefs, ...JSON.parse(stored) } : defaultNotifPrefs;
    } catch { return defaultNotifPrefs; }
  });

  const defaultEmailPrefs = { matches: true, messages: false, likes: true, insights: true, marketing: false };
  const [emailPrefs, setEmailPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem("stellara-email-prefs");
      return stored ? { ...defaultEmailPrefs, ...JSON.parse(stored) } : defaultEmailPrefs;
    } catch { return defaultEmailPrefs; }
  });

  const updateNotifPref = (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem("stellara-notif-prefs", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("stellara-notif-prefs-changed"));
    toast.success(value ? `${key.charAt(0).toUpperCase() + key.slice(1)} notifications enabled` : `${key.charAt(0).toUpperCase() + key.slice(1)} notifications muted`);
  };

  const updateEmailPref = (key: string, value: boolean) => {
    const updated = { ...emailPrefs, [key]: value };
    setEmailPrefs(updated);
    localStorage.setItem("stellara-email-prefs", JSON.stringify(updated));
    toast.success(value ? `${key.charAt(0).toUpperCase() + key.slice(1)} email notifications enabled` : `${key.charAt(0).toUpperCase() + key.slice(1)} email notifications muted`);
  };

  // Load actual user data
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, birth_date, birth_time, birth_place, current_city, max_distance_km, relationship_goal, preferred_genders, preferred_elements, preferred_hd_types, is_paused, is_incognito")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoadingProfile(false);
      });

    // Check verification status
    supabase
      .from("photo_verifications")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setVerificationStatus(data?.status || null);
      });

    // Load briefing reminder prefs
    supabase
      .from("profiles")
      .select("briefing_email_reminder, briefing_push_reminder, briefing_reminder_hour, briefing_reminder_timezone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBriefingPrefs((prev) => ({
          email: !!data.briefing_email_reminder,
          push: !!data.briefing_push_reminder,
          hour: typeof data.briefing_reminder_hour === "number" ? data.briefing_reminder_hour : 8,
          timezone: data.briefing_reminder_timezone || prev.timezone,
        }));
      });
  }, [user]);

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Push notifications enabled ✨");
    } else if (permission === "denied") {
      toast.error("Notifications are blocked in your browser settings");
    } else {
      toast.error("Could not enable push notifications");
    }
  };

  const updateBriefingPref = async (
    patch: Partial<{ email: boolean; push: boolean; hour: number; timezone: string }>
  ) => {
    if (!user) return;
    const next = { ...briefingPrefs, ...patch };
    setBriefingPrefs(next);
    setSavingBriefing(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        briefing_email_reminder: next.email,
        briefing_push_reminder: next.push,
        briefing_reminder_hour: next.hour,
        briefing_reminder_timezone: next.timezone,
      })
      .eq("user_id", user.id);
    setSavingBriefing(false);
    if (error) {
      toast.error("Couldn't save reminder settings");
      return;
    }
    if ("email" in patch || "push" in patch) {
      const turnedOn = (patch.email ?? next.email) || (patch.push ?? next.push);
      toast.success(
        turnedOn ? "Daily Briefing reminders updated ✨" : "Reminders turned off"
      );
    } else {
      toast.success("Reminder time updated");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Signed out. See you next time! 🌙");
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      
      
      <div className="relative z-10 pt-24 md:pt-28 pb-24 md:pb-12">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2 bg-gradient-aurora bg-clip-text text-transparent">
              {t("settings.title")}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              {t("settings.subtitle")}
            </p>
          </div>

          <div className="grid gap-6">
            {/* Account Settings */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-primary" />
                  {t("settings.account")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ""} disabled className="bg-background/50 opacity-70" />
                    <p className="text-[10px] text-muted-foreground mt-1">Email can't be changed here</p>
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input value={profile?.display_name || ""} disabled className="bg-background/50 opacity-70" />
                    <p className="text-[10px] text-muted-foreground mt-1">Edit on your Blueprint page</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Birth Date</Label>
                    <Input value={profile?.birth_date || "Not set"} disabled className="bg-background/50 opacity-70" />
                  </div>
                  <div>
                    <Label>Birth Time</Label>
                    <Input value={profile?.birth_time?.slice(0, 5) || "Not set"} disabled className="bg-background/50 opacity-70" />
                  </div>
                  <div>
                    <Label>Birth Place</Label>
                    <Input value={profile?.birth_place || "Not set"} disabled className="bg-background/50 opacity-70" />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Birth details can be updated on your{" "}
                  <button onClick={() => navigate("/profile")} className="text-primary hover:underline">
                    Blueprint page
                  </button>
                </p>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Profile Checklist</span>
                    <p className="text-sm text-muted-foreground">Show the profile completion checklist on your Blueprint page</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => {
                      localStorage.removeItem('profile-checklist-dismissed');
                      toast.success("Profile checklist will appear on your Blueprint page");
                    }}
                  >
                    Re-show Checklist
                  </Button>
                </div>

                <Separator />

                <BriefingCacheRow />
              </CardContent>
            </Card>

            {/* Connection Preferences */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-accent" />
                  {t("settings.connection_prefs")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">{t("settings.looking_for")}</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {profile?.relationship_goal || "Not set"} — update this in your Blueprint
                  </p>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium mb-3 block">{t("settings.discovery_distance")}</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={profile?.max_distance_km ? Math.round(profile.max_distance_km * 0.621371) : 62}
                      onChange={async (e) => {
                        const miles = parseInt(e.target.value);
                        if (isNaN(miles) || miles < 1) return;
                        const km = Math.round(miles / 0.621371);
                        setProfile({ ...profile, max_distance_km: km });
                        await supabase.from("profiles").update({ max_distance_km: km }).eq("user_id", user!.id);
                      }}
                      className="bg-background/50 w-24 h-11 text-base"
                      min={1}
                      max={12000}
                    />
                    <span className="text-sm text-muted-foreground">miles</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">How far from you we'll search for matches</p>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  {t("settings.notifications")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Push Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Smartphone className="w-4 h-4" /> {t("settings.push_notifications")}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {!isSupported
                        ? "Not supported in this browser"
                        : permission === "granted"
                        ? "Enabled — you'll receive daily cosmic intentions"
                        : permission === "denied"
                        ? "Blocked — update in browser settings"
                        : "Get daily insights even when the app is closed"}
                    </p>
                  </div>
                  {isSupported && permission !== "granted" && (
                    <Button
                      variant="outline"
                      onClick={handleEnablePush}
                      className="border-primary/30 text-primary hover:bg-primary/10 min-h-[44px] px-5 active:scale-95 transition-transform"
                    >
                      Enable
                    </Button>
                  )}
                  {permission === "granted" && (
                    <Badge className="bg-green-500/20 text-green-400 px-3 py-1">Active</Badge>
                  )}
                </div>

                <Separator />

                {/* Daily Cosmic Briefing reminders */}
                <div className="space-y-3">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-400" /> Daily Cosmic Briefing reminders
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Get a gentle morning ping with today's energy theme.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pl-6">
                    <span className="text-sm flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5" /> Push notification
                    </span>
                    <Switch
                      checked={briefingPrefs.push}
                      disabled={savingBriefing}
                      onCheckedChange={(v) => updateBriefingPref({ push: v })}
                      aria-label="Toggle daily briefing push reminder"
                    />
                  </div>

                  <div className="flex items-center justify-between pl-6">
                    <span className="text-sm flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> Email reminder
                    </span>
                    <Switch
                      checked={briefingPrefs.email}
                      disabled={savingBriefing}
                      onCheckedChange={(v) => updateBriefingPref({ email: v })}
                      aria-label="Toggle daily briefing email reminder"
                    />
                  </div>

                  {(briefingPrefs.push || briefingPrefs.email) && (
                    <div className="flex items-center justify-between gap-3 pl-6">
                      <Label htmlFor="briefing-hour" className="text-sm flex items-center gap-2 mb-0">
                        <Calendar className="w-3.5 h-3.5" /> Send at
                      </Label>
                      <select
                        id="briefing-hour"
                        value={briefingPrefs.hour}
                        disabled={savingBriefing}
                        onChange={(e) => updateBriefingPref({ hour: parseInt(e.target.value, 10) })}
                        className="bg-background/60 border border-border/50 rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i.toString().padStart(2, "0")}:00 ({briefingPrefs.timezone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <Separator />

                <p className="text-xs text-muted-foreground">Choose which in-app notifications you'd like to receive</p>

                {/* Matches */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Heart className="w-4 h-4 text-accent" /> {t("settings.new_matches")}
                    </span>
                    <p className="text-sm text-muted-foreground">{t("settings.new_matches_desc")}</p>
                  </div>
                  <Switch
                    checked={notifPrefs.matches}
                    onCheckedChange={(checked) => updateNotifPref("matches", checked)}
                  />
                </div>

                <Separator />

                {/* Likes */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4 text-pink-400" /> Photo Likes
                    </span>
                    <p className="text-sm text-muted-foreground">When someone likes your photos</p>
                  </div>
                  <Switch
                    checked={notifPrefs.likes}
                    onCheckedChange={(checked) => updateNotifPref("likes", checked)}
                  />
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" /> {t("nav.messages")}
                    </span>
                    <p className="text-sm text-muted-foreground">{t("settings.messages_desc")}</p>
                  </div>
                  <Switch
                    checked={notifPrefs.messages}
                    onCheckedChange={(checked) => updateNotifPref("messages", checked)}
                  />
                </div>

                <Separator />

                {/* Cosmic Insights */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" /> {t("settings.cosmic_insights")}
                    </span>
                    <p className="text-sm text-muted-foreground">{t("settings.cosmic_insights_desc")}</p>
                  </div>
                  <Switch
                    checked={notifPrefs.insights}
                    onCheckedChange={(checked) => updateNotifPref("insights", checked)}
                  />
                </div>

                <Separator />

                {/* Marketing */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-muted-foreground" /> {t("settings.tips_updates")}
                    </span>
                    <p className="text-sm text-muted-foreground">{t("settings.tips_updates_desc")}</p>
                  </div>
                  <Switch
                    checked={notifPrefs.marketing}
                    onCheckedChange={(checked) => updateNotifPref("marketing", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Notifications */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  {t("settings.email_notifications")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Control which email notifications you'd like to receive</p>

                {/* Email - Matches */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Heart className="w-4 h-4 text-accent" /> New Matches
                    </span>
                    <p className="text-sm text-muted-foreground">Email when someone likes you back</p>
                  </div>
                  <Switch
                    checked={emailPrefs.matches}
                    onCheckedChange={(checked) => updateEmailPref("matches", checked)}
                  />
                </div>

                <Separator />

                {/* Email - Likes */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4 text-pink-400" /> Photo Likes
                    </span>
                    <p className="text-sm text-muted-foreground">Email when someone likes your photos</p>
                  </div>
                  <Switch
                    checked={emailPrefs.likes}
                    onCheckedChange={(checked) => updateEmailPref("likes", checked)}
                  />
                </div>

                <Separator />

                {/* Email - Messages */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" /> Messages
                    </span>
                    <p className="text-sm text-muted-foreground">Email when you have unread messages</p>
                  </div>
                  <Switch
                    checked={emailPrefs.messages}
                    onCheckedChange={(checked) => updateEmailPref("messages", checked)}
                  />
                </div>

                <Separator />

                {/* Email - Cosmic Insights */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" /> Cosmic Insights
                    </span>
                    <p className="text-sm text-muted-foreground">Weekly cosmic summary via email</p>
                  </div>
                  <Switch
                    checked={emailPrefs.insights}
                    onCheckedChange={(checked) => updateEmailPref("insights", checked)}
                  />
                </div>

                <Separator />

                {/* Email - Marketing */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-muted-foreground" /> Tips & Updates
                    </span>
                    <p className="text-sm text-muted-foreground">Product news & cosmic tips via email</p>
                  </div>
                  <Switch
                    checked={emailPrefs.marketing}
                    onCheckedChange={(checked) => updateEmailPref("marketing", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Spotify Integration */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#1DB954]" />
                  Spotify
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Show what you're listening to on your profile</p>
                <SpotifyConnect />
              </CardContent>
            </Card>

            {/* Photo Verification */}
            {verificationStatus !== "verified" && (
              <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    Photo Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasSkippedVerification() && !verificationStatus && (
                    <p className="text-sm text-muted-foreground mb-4">
                      You skipped verification earlier. Verify now to earn a trust badge on your profile.
                    </p>
                  )}
                  <SelfieVerification />
                </CardContent>
              </Card>
            )}

            <LanguageCard />

            <AccessibilityCard />


            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pause / Snooze Profile */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <PauseCircle className="w-4 h-4" /> Pause Profile
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {profile?.is_paused
                        ? "Your profile is hidden from discovery"
                        : "Temporarily hide your profile from others"}
                    </p>
                  </div>
                  <Switch
                    checked={profile?.is_paused || false}
                    onCheckedChange={async (checked) => {
                      setProfile({ ...profile, is_paused: checked });
                      await supabase.from("profiles").update({ is_paused: checked }).eq("user_id", user!.id);
                      toast.success(checked ? "Profile paused — you're hidden from discovery 🌙" : "Profile unpaused — you're back in the cosmos ✨");
                    }}
                  />
                </div>

                <Separator />

                {/* Incognito Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Incognito Mode
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {profile?.is_incognito ? "You're invisible in discovery" : "Browse without appearing in others' stacks"}
                    </p>
                  </div>
                  <Switch
                    checked={profile?.is_incognito || false}
                    onCheckedChange={async (checked) => {
                      setProfile({ ...profile, is_incognito: checked });
                      await supabase.from("profiles").update({ is_incognito: checked }).eq("user_id", user!.id);
                      toast.success(checked ? "Incognito mode on — you're invisible 👻" : "Incognito off — you're visible again ✨");
                    }}
                  />
                </div>

                <Separator />

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stellara Pro */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  Stellara Pro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isPro ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      You're a Stellara Pro member. ✦ Manage your plan or restore a previous purchase below.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          await manageSubscription();
                        } catch {
                          toast.error("Couldn't open subscription portal");
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50 hover:border-amber-400/40 transition-all"
                    >
                      <span className="font-medium flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" /> Manage Subscription
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Unlock Lyra deep readings, Soulmate Sketch, who liked you, boosts, and more. ✦
                    </p>
                    <button
                      onClick={() => navigate("/premium")}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/15 to-amber-300/10 border border-amber-400/40 hover:border-amber-400/70 transition-all"
                    >
                      <span className="font-medium flex items-center gap-2 text-amber-300">
                        <Crown className="w-4 h-4" /> Upgrade to Pro ✦
                      </span>
                      <ChevronRight className="w-4 h-4 text-amber-300" />
                    </button>
                  </>
                )}
                <button
                  onClick={async () => {
                    toast.info("Checking for previous purchases…");
                    try {
                      await refreshSubscription();
                      toast.success("Purchases restored if found ✦");
                    } catch {
                      toast.error("Couldn't restore purchases");
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50 hover:border-primary/40 transition-all"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Restore Purchases
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>

            {/* About */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => navigate("/privacy")}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50 hover:border-primary/40 transition-all"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" /> Privacy Policy
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => navigate("/terms")}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50 hover:border-primary/40 transition-all"
                >
                  <span className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" /> Terms of Service
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => navigate("/safety")}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50 hover:border-primary/40 transition-all"
                >
                  <span className="font-medium flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-muted-foreground" /> Community Guidelines
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => {
                    // Best-effort: opens iOS App Store review when app is published.
                    window.open("https://apps.apple.com/app/stellara", "_blank");
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50 hover:border-amber-400/40 transition-all"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" /> Rate Stellara ✦
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <p className="text-center text-xs text-muted-foreground/70 pt-3">
                  App Version {APP_VERSION}
                </p>
              </CardContent>
            </Card>

            {/* Sign Out */}
            <div className="flex justify-center pt-2 pb-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowSignOutDialog(true)}
                className="border-[#D85A30]/40 text-[#D85A30] hover:bg-[#D85A30]/10 hover:text-[#D85A30] gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Your Account
            </DialogTitle>
            <DialogDescription>
              This is permanent and can't be undone. All your data, matches, messages, and profile will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">Type <strong>DELETE</strong> to confirm:</Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="bg-muted/30 border-border/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "DELETE" || deleting}
              onClick={async () => {
                if (!user) return;
                setDeleting(true);
                try {
                  const { error } = await supabase.rpc("delete_user_data", { target_user_id: user.id });
                  if (error) throw error;
                  await signOut();
                  toast.success("Your account has been deleted. Take care out there. 🌙");
                  navigate("/auth");
                } catch (err: any) {
                  toast.error(err.message || "Failed to delete account");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-[#D85A30]" /> Sign out of Stellara?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? You can sign back in anytime with your email or social account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setShowSignOutDialog(false);
                await handleSignOut();
              }}
              className="bg-[#D85A30] hover:bg-[#D85A30]/90 text-white"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;