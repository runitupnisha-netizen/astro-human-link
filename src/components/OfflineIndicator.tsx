import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useState, useEffect } from "react";

const OfflineIndicator = () => {
  const online = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const t = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [online, wasOffline]);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground text-center py-2 text-sm font-medium flex items-center justify-center gap-2"
        >
          <WifiOff className="w-4 h-4" />
          You're offline — some features may not work
        </motion.div>
      )}
      {showReconnected && online && (
        <motion.div
          key="reconnected"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-green-600 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Back online
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
