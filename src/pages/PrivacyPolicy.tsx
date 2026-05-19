import CosmicBackground from "@/components/CosmicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background relative">
    <CosmicBackground />
    {/* pb-24 keeps the last section clear of the mobile bottom tab bar. */}
    <div className="relative z-10 pt-20 pb-24 md:pb-12">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2 text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: April 2026</p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
              <p>We collect information you provide directly when you create an account and use Stellara, including: email address and password (stored as a salted hash), display name and username, date and time of birth, birth location (city and coordinates), current city and approximate coordinates for proximity-based matching, gender, sexual/relationship preferences, profile photos, written bio prompts, voice intros and voice messages, music preferences (when you connect Spotify), and lifestyle answers such as kids, drinking, smoking, and spiritual practice.</p>
              <p className="mt-2">We automatically derive astrological, Human Design, and numerology data (Sun/Moon/Rising, planets, type, strategy, authority, Life Path, etc.) from the birth data you provide and store it on your profile.</p>
              <p className="mt-2">We also collect usage data: matches, likes, swipes, blocks, reports, profile views, messages and reactions, call session metadata, AI (Lyra) conversations, notification preferences, analytics events (page views, feature interactions), device information, last-seen timestamps, and IP address.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
              <p>Your data is used to: create and maintain your account; generate cosmic profiles and compatibility scores; match you with other users; send notifications and insights; improve our algorithms; and prevent fraud or abuse.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Information Sharing</h2>
              <p>We share your profile (name, photos, age, city, blueprint highlights, bio, voice intro) with other users as part of the discovery and matching experience. We do not sell your personal data and do not use it for cross-app or cross-site advertising tracking.</p>
              <p className="mt-2">We use the following sub-processors strictly to operate the service:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li><strong>Supabase</strong> — authentication, database, file storage, edge functions, push notifications</li>
                <li><strong>Stripe</strong> — subscription billing on the web (Stripe receives payment details directly; we never store card numbers)</li>
                <li><strong>Apple StoreKit</strong> — subscription billing on iOS (handled entirely by Apple)</li>
                <li><strong>Google Gemini via Lovable AI Gateway</strong> — generating cosmic readings and powering the Lyra AI guide; prompts containing your blueprint data and chat messages are sent for inference and are not used to train models</li>
                <li><strong>Twilio</strong> — phone verification and (when activated) voice/video calls</li>
                <li><strong>Spotify</strong> — optional music integration via OAuth, only when you connect your account</li>
                <li><strong>Tenor</strong> — GIF search (queries only, no personal data attached)</li>
                <li><strong>Resend</strong> — transactional email delivery</li>
              </ul>
              <p className="mt-2">We may disclose information when required by law or to protect the safety of our users.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Storage & Security</h2>
              <p>Your data is stored securely using industry-standard encryption and cloud infrastructure with row-level security policies. Despite our best efforts, no method of transmission over the internet is 100% secure.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Your Rights</h2>
              <p>You have the right to access, correct, export, and permanently delete your personal data. You can delete your account and all associated data (profile, photos, messages, matches, AI history, and analytics linked to your user ID) at any time from <strong>Settings → Delete Account</strong>. Deletion is immediate and irreversible. You may also email <a href="mailto:info@stellaraapp.net" className="text-primary hover:underline">info@stellaraapp.net</a> to request deletion.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Cookies & Tracking</h2>
              <p>We use essential cookies and local storage for authentication and app functionality. We do not use third-party tracking cookies or advertising pixels.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Children's Privacy</h2>
              <p>Stellara is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If we learn we have collected data from a minor, we will promptly delete it.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Changes to This Policy</h2>
              <p>We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">9. Contact Us</h2>
              <p>For privacy-related inquiries, contact us at <a href="mailto:info@stellaraapp.net" className="text-primary hover:underline">info@stellaraapp.net</a>. We aim to respond within 30 days.</p>
            </section>

            <section className="border-t border-border pt-4 mt-6">
              <p className="text-xs text-muted-foreground/70 text-center">
                By using Stellara, you consent to the collection and use of your information as described in this Privacy Policy.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  </div>
);

export default PrivacyPolicy;
