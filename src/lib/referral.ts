/**
 * Referral code capture & retrieval.
 * When someone visits /join/[CODE] (or /sign-in?ref=[CODE]), we stash the code
 * in localStorage for 30 days, then auto-redeem it after sign-up when the
 * new user reaches Moment 3 (the birth-chart reveal step in onboarding).
 */

const STORAGE_KEY = "stellara:referral_code";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type StoredReferral = {
  code: string;
  capturedAt: number;
};

export const captureReferralCode = (rawCode: string | null | undefined): void => {
  if (!rawCode) return;
  const code = rawCode.trim().toUpperCase();
  // 6-char alphanumeric, our alphabet excludes 0/O/1/I
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return;
  try {
    const payload: StoredReferral = { code, capturedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
};

export const getStoredReferralCode = (): string | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (!parsed?.code) return null;
    if (Date.now() - parsed.capturedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
};

export const clearStoredReferralCode = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * Pull a ?ref= param from the current URL, store it, and return it.
 * Safe to call on every app load.
 */
export const captureReferralFromUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      captureReferralCode(ref);
      return ref.toUpperCase();
    }
  } catch {
    /* ignore */
  }
  return getStoredReferralCode();
};