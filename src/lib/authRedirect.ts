import { supabase } from "@/integrations/supabase/client";
import type { EmailOtpType, Session } from "@supabase/supabase-js";

export const AUTH_CALLBACK_PATH = "/auth/callback";

const CALLBACK_OTP_TYPES = new Set<EmailOtpType>(["magiclink", "email", "signup", "invite"]);

const cleanAuthUrl = () => {
  const cleanPath = window.location.pathname === AUTH_CALLBACK_PATH ? "/" : window.location.pathname;
  window.history.replaceState(null, document.title, cleanPath);
};

export const isPasswordRecoveryRedirect = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    window.location.pathname === "/reset-password" ||
    searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery"
  );
};

export const completeAuthRedirectFromUrl = async (): Promise<Session | null> => {
  if (isPasswordRecoveryRedirect()) return null;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
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