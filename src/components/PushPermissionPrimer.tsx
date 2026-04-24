import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Bell } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PUSH_PERMISSION_PRIMER,
  PUSH_PRIMER_SHOWN_KEY,
} from "@/lib/notificationCopy";

interface Props {
  open: boolean;
  onClose: () => void;
  onAccept: () => Promise<void> | void;
}

/**
 * In-app primer that appears BEFORE the OS push permission dialog.
 * Per spec: only triggered after the user completes their first Daily Ritual.
 */
const PushPermissionPrimer = ({ open, onClose, onAccept }: Props) => {
  const handleAccept = async () => {
    localStorage.setItem(PUSH_PRIMER_SHOWN_KEY, "true");
    await onAccept();
    onClose();
  };

  const handleDecline = () => {
    localStorage.setItem(PUSH_PRIMER_SHOWN_KEY, "true");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleDecline()}>
      <DialogContent className="max-w-sm bg-card border-border/50">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-14 h-14 rounded-full bg-gradient-mystical flex items-center justify-center"
          >
            <Bell className="w-6 h-6 text-accent" />
          </motion.div>
          <div className="space-y-2">
            <h3 className="font-display text-xl font-bold text-foreground">
              {PUSH_PERMISSION_PRIMER.headline}
            </h3>
            <p className="text-sm text-muted-foreground font-serif">
              {PUSH_PERMISSION_PRIMER.body}
            </p>
          </div>
          <div className="w-full space-y-2 pt-2">
            <Button
              onClick={handleAccept}
              className="w-full gap-2 h-12 rounded-full font-medium"
              style={{ background: "var(--gradient-aurora)" }}
            >
              <Sparkles className="w-4 h-4" />
              {PUSH_PERMISSION_PRIMER.acceptLabel}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDecline}
              className="w-full h-11 text-muted-foreground hover:text-foreground"
            >
              {PUSH_PERMISSION_PRIMER.declineLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PushPermissionPrimer;