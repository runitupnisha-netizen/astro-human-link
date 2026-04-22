import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(formData);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message || "Please check your inputs";
      toast({ title: first, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { name, email, subject, message } = parsed.data;
      const submissionId = crypto.randomUUID();

      const adminPromise = supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-notification",
          idempotencyKey: `contact-notify-${submissionId}`,
          templateData: { name, email, subject: subject || "", message },
        },
      });
      const userPromise = supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-confirmation",
          recipientEmail: email,
          idempotencyKey: `contact-confirm-${submissionId}`,
          templateData: { name, subject: subject || "", message },
        },
      });

      const [adminRes, userRes] = await Promise.all([adminPromise, userPromise]);
      if (adminRes.error) console.error("Admin email error:", adminRes.error);
      if (userRes.error) console.error("User email error:", userRes.error);

      if (adminRes.error) {
        toast({
          title: "Couldn't send right now",
          description: "Please try again in a moment, or email us directly at stellaradating@gmail.com.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message sent ✨",
        description: "We've received your message. Check your inbox for confirmation — we'll reply within 24–48 hours.",
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error("Contact submit failed:", err);
      toast({
        title: "Something went wrong",
        description: "Please try again or email us at stellaradating@gmail.com.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* pt-20 clears the fixed top nav; pb-24 clears the mobile bottom tab
          bar so the form's submit button is never overlapped. */}
      <div className="flex-1 container max-w-2xl mx-auto px-4 pt-20 pb-24 md:py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-muted-foreground">
            Have a question, suggestion, or need help? We'd love to hear from you.
          </p>
        </div>

        <Card className="mb-8 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    maxLength={255}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="What's this about?"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us what's on your mind..."
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  maxLength={2000}
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-muted-foreground text-sm space-y-2">
          <p>You can also reach us directly at:</p>
          <a
            href="mailto:stellaradating@gmail.com"
            className="text-primary hover:underline font-medium text-base"
          >
            stellaradating@gmail.com
          </a>
          <p className="mt-4 text-xs">We typically respond within 24–48 hours.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
