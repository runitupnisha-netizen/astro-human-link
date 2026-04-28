import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { captureReferralCode } from "@/lib/referral";
import { useAuth } from "@/hooks/useAuth";
import SparkleLoader from "@/components/SparkleLoader";

/**
 * Deep-link handler for stellara.app/join/[CODE].
 * - Stores the code in localStorage (30-day TTL).
 * - If the visitor isn't signed in, sends them to /sign-in with the
 *   code preserved.
 * - If they're already signed in, sends them to the Referral page so they
 *   can either redeem (if eligible) or share their own.
 */
const JoinWithCode = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (code) captureReferralCode(code);
  }, [code]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate("/referral", { replace: true });
    } else {
      navigate(`/sign-in?ref=${(code || "").toUpperCase()}`, { replace: true });
    }
  }, [loading, user, code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0c0b13" }}>
      <SparkleLoader size={36} />
    </div>
  );
};

export default JoinWithCode;