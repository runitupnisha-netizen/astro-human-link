import { useRef, useCallback, useState } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export const usePullToRefresh = ({ onRefresh, threshold = 80 }: PullToRefreshOptions) => {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  }, [pulling, refreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, threshold, refreshing, onRefresh]);

  const pullIndicator = (pullDistance > 10 || refreshing) ? (
    <div
      className="flex items-center justify-center transition-all duration-200"
      style={{ height: refreshing ? 48 : pullDistance, overflow: "hidden" }}
    >
      <div className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${refreshing ? "animate-spin" : ""}`}
        style={{ opacity: Math.min(pullDistance / threshold, 1), transform: `rotate(${pullDistance * 3}deg)` }}
      />
    </div>
  ) : null;

  return {
    containerRef,
    pullIndicator,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
};
