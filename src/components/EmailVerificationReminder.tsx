import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const EmailVerificationReminder = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  const isUnverified = user && !user.email_confirmed_at;

  if (!isUnverified || dismissed) return null;

  const resend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: user.email! });
      if (error) throw error;
      toast.success("Verification email sent! Check your inbox 📧");
    } catch (e: any) {
      toast.error(e.message || "Failed to resend");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
      >
        <div className="glass-card border border-accent/30 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Verify your email</p>
            <p className="text-xs text-muted-foreground">Check your inbox to activate your account</p>
          </div>
          <Button size="sm" variant="outline" className="border-accent/30 shrink-0" onClick={resend} disabled={sending}>
            Resend
          </Button>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmailVerificationReminder;
