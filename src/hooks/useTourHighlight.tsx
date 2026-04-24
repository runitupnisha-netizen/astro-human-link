import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TOUR_HIGHLIGHT_PARAM } from "@/components/OnboardingTour";

/**
 * Reads `?tour=<id>` from the current URL. If `id` matches the provided
 * `targetId`, returns `true` for ~3.5s so the consumer can pulse / highlight
 * the relevant feature, then strips the query param so a refresh doesn't
 * re-trigger the highlight.
 */
export const useTourHighlight = (targetId: string, durationMs = 3500) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get(TOUR_HIGHLIGHT_PARAM) !== targetId) return;
    setActive(true);

    // Strip the query param so refresh / back-nav doesn't loop.
    params.delete(TOUR_HIGHLIGHT_PARAM);
    const cleaned = params.toString();
    navigate(
      { pathname: location.pathname, search: cleaned ? `?${cleaned}` : "" },
      { replace: true },
    );

    const t = window.setTimeout(() => setActive(false), durationMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  return active;
};