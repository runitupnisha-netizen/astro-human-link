import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, Phone, MapPin, Eye, Ban, Flag, Heart, MessageCircle, Lock, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import CosmicBackground from "@/components/CosmicBackground";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";

const sections = [
  {
    icon: Shield,
    title: "Before You Meet",
    color: "text-primary",
    bg: "bg-primary/10",
    tips: [
      "Video chat first — verify they look like their photos before meeting in person.",
      "Tell a trusted friend or family member where you're going and who you're meeting.",
      "Always meet in a public, well-lit location for your first few dates.",
      "Arrange your own transportation — don't depend on your date for a ride.",
      "Trust your instincts — if something feels off, it probably is.",
    ],
  },
  {
    icon: MapPin,
    title: "During Your Date",
    color: "text-accent",
    bg: "bg-accent/10",
    tips: [
      "Stay in public spaces, especially during the first few meetings.",
      "Keep your phone charged and location sharing on with a friend.",
      "Don't leave drinks or food unattended.",
      "Set your own limits and don't feel pressured to do anything you're uncomfortable with.",
      "Have a code word with a friend — if you text it, they'll call with an 'emergency'.",
    ],
  },
  {
    icon: Lock,
    title: "Protect Your Privacy",
    color: "text-primary",
    bg: "bg-primary/10",
    tips: [
      "Don't share your home or work address until you've built real trust.",
      "Keep financial information private — never send money to someone you haven't met.",
      "Use Stellara's in-app messaging until you're comfortable sharing your number.",
      "Be cautious with people who refuse to video chat or meet in person.",
      "Watch for red flags: love bombing, isolation tactics, or pressure to move fast.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Red Flags to Watch For",
    color: "text-destructive",
    bg: "bg-destructive/10",
    tips: [
      "They ask for money or financial favors early in the relationship.",
      "They pressure you to leave the app or communicate through unverified channels.",
      "Their story keeps changing or they avoid answering basic questions.",
      "They get angry or manipulative when you set boundaries.",
      "They refuse to meet in person after weeks of chatting.",
    ],
  },
];

const SafetyCenter = () => {
  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4">
      <div data-back-button-injected className="absolute top-[calc(env(safe-area-inset-top,0px)+4rem)] left-2 z-40">
        <BackButton fallback="/" />
      </div>
      <CosmicBackground />
      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Safety Center</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Your Safety Matters
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Stellara is built with your wellbeing in mind. Here's how to stay safe while making cosmic connections.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card/70 backdrop-blur-sm border-border/40">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground text-sm mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/settings" className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-border/30">
                  <Ban className="w-4 h-4 text-destructive" />
                  <span className="text-xs font-medium text-foreground">Manage Blocks</span>
                </Link>
                <Link to="/settings" className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-border/30">
                  <Flag className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-foreground">Report a User</span>
                </Link>
                <Link to="/privacy" className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-border/30">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">Privacy Policy</span>
                </Link>
                <Link to="/terms" className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-border/30">
                  <MessageCircle className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium text-foreground">Terms of Service</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Safety Sections */}
        {sections.map((section, sIdx) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={sIdx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + sIdx * 0.08 }}
            >
              <Card className="bg-card/70 backdrop-blur-sm border-border/40">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${section.color}`} />
                    </div>
                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {section.tips.map((tip, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${section.bg.replace("/10", "/40")} mt-2 shrink-0`} />
                        <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Emergency Resources */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground">Emergency Resources</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">Emergency Services</p>
                    <p className="text-xs text-muted-foreground">Call if you're in immediate danger</p>
                  </div>
                  <a href="tel:911" className="text-sm font-bold text-destructive hover:underline">911</a>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">National DV Hotline</p>
                    <p className="text-xs text-muted-foreground">24/7 support for domestic violence</p>
                  </div>
                  <a href="tel:18007997233" className="text-sm font-bold text-primary hover:underline">1-800-799-7233</a>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">Crisis Text Line</p>
                    <p className="text-xs text-muted-foreground">Text HOME to 741741</p>
                  </div>
                  <span className="text-sm font-bold text-primary">741741</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center text-[11px] text-muted-foreground/60 pb-4">
          Remember: Your safety is always more important than being polite. Trust your intuition. 💜
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default SafetyCenter;
