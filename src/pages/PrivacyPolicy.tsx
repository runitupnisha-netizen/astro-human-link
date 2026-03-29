import CosmicBackground from "@/components/CosmicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background relative">
    <CosmicBackground />
    <div className="relative z-10 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2 text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: March 2026</p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
              <p>We collect information you provide directly: name, email, birth details, photos, location, and profile preferences. We also collect usage data including app interactions, device information, and IP addresses to improve our services.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
              <p>Your data is used to: create and maintain your account; generate cosmic profiles and compatibility scores; match you with other users; send notifications and insights; improve our algorithms; and prevent fraud or abuse.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Information Sharing</h2>
              <p>We share your profile information with other users as part of the matching experience. We do not sell your personal data to third parties. We may share anonymized, aggregated data for analytics purposes. We will disclose information when required by law.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Storage & Security</h2>
              <p>Your data is stored securely using industry-standard encryption. We use Supabase infrastructure with row-level security policies. Despite our best efforts, no method of transmission over the internet is 100% secure.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Your Rights</h2>
              <p>You have the right to: access your personal data; correct inaccurate data; delete your account and all associated data; export your data; and opt out of marketing communications. Exercise these rights through the Settings page.</p>
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
              <p>For privacy-related inquiries, contact us at privacy@stellara.app. We aim to respond within 30 days.</p>
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
