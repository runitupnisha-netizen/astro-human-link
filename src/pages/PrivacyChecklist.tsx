import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Camera, Mic, Heart, Sparkles, Trash2, Download, Shield, Check, Mail, Lock, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DataItem {
  icon: React.ElementType;
  title: string;
  collected: string;
  purpose: string;
  required: boolean;
  retention: string;
}

const onboardingData: DataItem[] = [
  {
    icon: Calendar,
    title: "Birth Date, Time & Place",
    collected: "Date, time (optional), city/coordinates of birth",
    purpose: "Generates your astrology chart, Human Design type, and numerology — the core of your Stellara experience.",
    required: true,
    retention: "Until you delete your account",
  },
  {
    icon: MapPin,
    title: "Current Location",
    collected: "City and approximate coordinates (you choose precision)",
    purpose: "Shows distance to potential connections in miles. Never shared as exact coordinates with other users.",
    required: true,
    retention: "Until updated or account deleted",
  },
  {
    icon: Camera,
    title: "Profile Photos",
    collected: "Up to 999 photos you choose to upload",
    purpose: "Shown to other users in the Connect feed and connections. Stored privately and served via signed URLs.",
    required: false,
    retention: "Until you remove them or delete your account",
  },
  {
    icon: Mic,
    title: "Voice Intro (optional)",
    collected: "15-second audio recording",
    purpose: "Optional voice bio shown on your profile.",
    required: false,
    retention: "Until you remove it or delete your account",
  },
  {
    icon: Heart,
    title: "Lifestyle & Preferences",
    collected: "Gender, relationship goals, interests, lifestyle answers",
    purpose: "Connection filtering and compatibility scoring.",
    required: true,
    retention: "Until you delete your account",
  },
  {
    icon: Sparkles,
    title: "Generated Cosmic Profile",
    collected: "AI-generated astrology, Human Design, and numerology summaries",
    purpose: "Derived from your birth data — never sold, never shared with third parties.",
    required: true,
    retention: "Until you delete your account",
  },
];

const PrivacyChecklist = () => {
  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4 md:pt-28">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/30 mb-4">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Your Data, Your Cosmos
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A plain-language checklist of exactly what Stellara collects during onboarding, why we need it, and how to delete it.
          </p>
        </motion.div>

        <div className="space-y-4 mb-10">
          {onboardingData.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-5 border-border/50 hover:border-amber-400/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            item.required
                              ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {item.required ? "Required" : "Optional"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="text-foreground/80 font-medium">Collected: </span>
                        {item.collected}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="text-foreground/80 font-medium">Why: </span>
                        {item.purpose}
                      </p>
                      <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                        <Check className="w-3 h-3" /> Kept: {item.retention}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="p-6 border-amber-400/30 bg-amber-400/5 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-foreground mb-1">What we never do</h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex gap-2"><span className="text-amber-400">✦</span> Sell your data to third parties</li>
                <li className="flex gap-2"><span className="text-amber-400">✦</span> Share your exact birth time or coordinates with other users</li>
                <li className="flex gap-2"><span className="text-amber-400">✦</span> Use your photos to train AI models</li>
                <li className="flex gap-2"><span className="text-amber-400">✦</span> Show your profile to anyone if you pause or enable Incognito</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Trash2 className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-foreground mb-2">Request deletion (3 ways)</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-foreground/90 mb-1">1. In-app (instant)</p>
                  <p className="text-muted-foreground">
                    Profile → Settings → <span className="text-foreground">Delete Account</span>. Type <code className="text-amber-400">DELETE</code> to confirm. All data is purged immediately.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground/90 mb-1">2. Email (within 30 days)</p>
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <a href="mailto:info@stellaraapp.net" className="text-amber-400 hover:underline">
                      info@stellaraapp.net
                    </a>
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground/90 mb-1">3. Pause instead</p>
                  <p className="text-muted-foreground">
                    Profile → Privacy → <span className="text-foreground">Pause Profile</span>. Hides you from Discover without losing your matches.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-8">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-foreground mb-2">Your rights</h2>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>• Access — request a copy of your data anytime</li>
                <li>• Correction — edit profile data directly in the app</li>
                <li>• Deletion — see above</li>
                <li>• Portability — email us for a JSON export</li>
                <li>• Opt-out — toggle off email/push in Notification Settings</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to="/privacy">
              <Download className="w-4 h-4 mr-2" /> Full Privacy Policy
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/terms">Terms of Service</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Contact Support</Link>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground/70 mt-8">
          Last reviewed April 2026 · Stellara complies with GDPR, CCPA, and Apple App Store privacy guidelines.
        </p>
      </div>
    </div>
  );
};

export default PrivacyChecklist;