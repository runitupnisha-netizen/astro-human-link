import { motion } from "framer-motion";

const SkeletonPulse = ({ className = "" }: { className?: string }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    className={`bg-muted/40 rounded-lg ${className}`}
  />
);

export const ProfileCardSkeleton = () => (
  <div className="w-full h-full rounded-3xl overflow-hidden border border-border/30 bg-card flex flex-col">
    <div className="relative w-full flex-1 min-h-0">
      <SkeletonPulse className="w-full h-full rounded-none" />
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-card via-card/80 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-7 w-40" />
            <SkeletonPulse className="h-4 w-28" />
          </div>
          <SkeletonPulse className="w-14 h-14 rounded-full" />
        </div>
      </div>
    </div>
    <div className="p-4 space-y-3">
      <div className="flex gap-1.5">
        <SkeletonPulse className="h-6 w-20 rounded-full" />
        <SkeletonPulse className="h-6 w-16 rounded-full" />
        <SkeletonPulse className="h-6 w-24 rounded-full" />
      </div>
      <SkeletonPulse className="h-4 w-full" />
      <SkeletonPulse className="h-4 w-3/4" />
    </div>
  </div>
);

export const ConversationSkeleton = () => (
  <div className="p-4 flex items-center gap-3 border-b border-border/30">
    <SkeletonPulse className="w-12 h-12 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-3 w-10" />
      </div>
      <SkeletonPulse className="h-3 w-40" />
    </div>
  </div>
);

export const ConnectionCardSkeleton = () => (
  <div className="p-4 rounded-xl border border-border/30 bg-card/60 space-y-3">
    <div className="flex items-center gap-3">
      <SkeletonPulse className="w-14 h-14 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="h-5 w-28" />
        <SkeletonPulse className="h-3 w-20" />
      </div>
      <SkeletonPulse className="w-12 h-12 rounded-full" />
    </div>
    <div className="flex gap-1.5">
      <SkeletonPulse className="h-5 w-16 rounded-full" />
      <SkeletonPulse className="h-5 w-20 rounded-full" />
    </div>
  </div>
);

export const MessageBubbleSkeleton = ({ isMe = false }: { isMe?: boolean }) => (
  <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"}`}>
      <SkeletonPulse className={`h-10 ${isMe ? "w-48 rounded-2xl rounded-br-md" : "w-56 rounded-2xl rounded-bl-md"}`} />
    </div>
  </div>
);

export default SkeletonPulse;
