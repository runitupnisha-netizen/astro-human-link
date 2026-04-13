import CosmicBackground from "@/components/CosmicBackground";
import SelfieVerification from "@/components/SelfieVerification";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const VerificationGate = () => {
  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center">
      <CosmicBackground />
      <div className="relative z-10 w-full max-w-md mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Verify Your Identity
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            To keep our community safe and authentic, please verify yourself with a quick selfie before continuing.
          </p>
        </motion.div>

        <SelfieVerification />
      </div>
    </div>
  );
};

export default VerificationGate;
