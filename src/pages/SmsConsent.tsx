import { Star } from "lucide-react";

const SmsConsent = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <Star className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Stellara SMS Consent & Opt-In Policy</h1>
      </div>

      <div className="space-y-6 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Purpose of SMS Messages</h2>
          <p>
            Stellara uses SMS exclusively for <strong>one-time verification codes (OTP)</strong> during account login and signup. 
            We do not send marketing messages, promotional content, or recurring texts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">How Consent Is Collected</h2>
          <p>
            Users explicitly opt in to receive a verification code by entering their phone number and tapping the 
            <strong> "Send Code" </strong> button on our login/signup screen. No SMS is sent without this direct user action.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Message Content</h2>
          <p>Each SMS contains only a 6-digit verification code in the following format:</p>
          <div className="bg-muted p-4 rounded-lg mt-2 font-mono text-sm">
            Your Stellara verification code is: 123456
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Message Frequency</h2>
          <p>
            Users receive <strong>one SMS per login/signup attempt</strong>, only when they request it. 
            Typical usage is 1–2 messages per user per month.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Opt-Out</h2>
          <p>
            Users can opt out at any time by simply not requesting a verification code, or by choosing an alternative 
            sign-in method (email or Google). Users may also reply <strong>STOP</strong> to any SMS to opt out.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Data Privacy</h2>
          <p>
            Phone numbers are used solely for verification purposes and are not shared with third parties for marketing. 
            See our <a href="/privacy" className="text-primary underline">Privacy Policy</a> for full details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Contact</h2>
          <p>
            For questions about our SMS practices, contact us at{" "}
            <a href="/contact" className="text-primary underline">our contact page</a>.
          </p>
        </section>
      </div>

      <p className="text-xs text-muted-foreground mt-12">
        Last updated: April 13, 2026
      </p>
    </div>
  );
};

export default SmsConsent;
