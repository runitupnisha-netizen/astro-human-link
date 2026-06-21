import { supabase } from "@/integrations/supabase/client";
import type { EmailOtpType, Session } from "@supabase/supabase-js";

export const AUTH_CALLBACK_PATH = "/auth/callback";
export const NATIVE_AUTH_CALLBACK_URL = "lovable://oauth-callback";

const CALLBACK_OTP_TYPES = new Set<EmailOtpType>(["magiclink", "email", "signup", "invite"]);

const cleanAuthUrl = () => {
  // After a successful auth redirect (magic link / OAuth / signup verify),
  // always send the user to the app root. Staying on /sign-in or
  // /auth/callback after the session is established is never desired.
  window.history.replaceState(null, document.title, "/");
};

const getUrlParts = (url?: string) => {
  if (!url) {
    return {
      pathname: window.location.pathname,
      searchParams: new URLSearchParams(window.location.search),
      hashParams: new URLSearchParams(window.location.hash.replace(/^#/, "")),
    };
  }

  const parsed = new URL(url);
  return {
    pathname: parsed.pathname,
    searchParams: new URLSearchParams(parsed.search),
    hashParams: new URLSearchParams(parsed.hash.replace(/^#/, "")),
  };
};

export const isPasswordRecoveryRedirect = (url?: string) => {
  const { pathname, searchParams, hashParams } = getUrlParts(url);
  return (
    pathname === "/reset-password" ||
    searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery"
  );
};

export const completeAuthRedirectFromUrl = async (url?: string): Promise<Session | null> => {
  if (isPasswordRecoveryRedirect(url)) return null;

  const { searchParams, hashParams } = getUrlParts(url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (data.session) {
      cleanAuthUrl();
      return data.session;
    }
  }

  if (tokenHash && otpType && CALLBACK_OTP_TYPES.has(otpType)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (error) throw error;
    if (data.session) {
      cleanAuthUrl();
      return data.session;
    }
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    if (data.session) {
      cleanAuthUrl();
      return data.session;
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session;
};