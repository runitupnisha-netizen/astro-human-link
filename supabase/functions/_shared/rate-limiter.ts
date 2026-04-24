import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // in milliseconds
  message?: string;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "check-subscription": { maxRequests: 30, windowMs: 60_000 },
  "create-checkout": { maxRequests: 5, windowMs: 60_000 },
  "customer-portal": { maxRequests: 5, windowMs: 60_000 },
  "discover-profiles": { maxRequests: 20, windowMs: 60_000 },
  "generate-cosmic-profile": { maxRequests: 3, windowMs: 300_000 },
  "generate-daily-intention": { maxRequests: 10, windowMs: 60_000 },
  "generate-icebreaker": { maxRequests: 10, windowMs: 60_000 },
  "generate-weekly-insights": { maxRequests: 5, windowMs: 300_000 },
  "analyze-compatibility": { maxRequests: 10, windowMs: 60_000 },
  "who-liked-me": { maxRequests: 15, windowMs: 60_000 },
  "push-vapid-key": { maxRequests: 10, windowMs: 60_000 },
  "search-gifs": { maxRequests: 30, windowMs: 60_000 },
  "spotify-auth": { maxRequests: 30, windowMs: 60_000 },
  // Calls realistically need a few retries (network blip → rejoin, peer
  // hangup + redial). Allow a generous short burst, then a slower long
  // window to discourage abuse without punishing normal usage.
  "create-call-room": {
    maxRequests: 10,
    windowMs: 60_000,
    message:
      "You're starting calls a little too quickly. Take a breath and try again in a few seconds.",
  },
};

// In-memory rate limiter (resets per cold start, ~5 min window)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  functionName: string,
  corsHeaders: Record<string, string>
): Response | null {
  const config = DEFAULT_LIMITS[functionName] || { maxRequests: 30, windowMs: 60_000 };
  const key = `${functionName}:${identifier}`;
  const now = Date.now();

  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return null; // allowed
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    const friendly =
      config.message ?? "Too many requests. Please try again in a moment.";
    return new Response(
      JSON.stringify({
        error: friendly,
        code: "RATE_LIMITED",
        retry_after: retryAfter,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  entry.count++;
  return null; // allowed
}

// Helper to extract identifier from request (user ID or IP)
export function getIdentifier(req: Request, userId?: string): string {
  if (userId) return userId;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore) {
    if (now > entry.resetAt) inMemoryStore.delete(key);
  }
}, 60_000);
