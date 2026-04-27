import { useNavigate } from "react-router-dom";
import CosmicBackground from "@/components/CosmicBackground";
import SelfieVerification from "@/components/SelfieVerification";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { markVerificationSkipped } from "@/hooks/useVerificationGate";

const VerificationGate = () => {
  const navigate = useNavigate();

  const handleSkip = () => {
    markVerificationSkipped();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center pb-24 md:pb-12">
      <CosmicBackground />
      <div className="relative z-10 w-full max-w-md mx-auto px-6 pt-20 pb-12 md:pt-12">
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

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground text-sm"
            onClick={handleSkip}
          >
            Skip for now — I'll verify later
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1">
            You can verify anytime from Settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationGate;
