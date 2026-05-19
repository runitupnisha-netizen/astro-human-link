import { useLocation, useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";

/**
 * Persistent floating action button — Lyra is one tap away from anywhere
 * except the Connections tab (per repositioning spec 6h).
 */
const HIDE_ON: Array<string | RegExp> = [
  "/connections",
  "/messages",
  /^\/compatibility\//,
  "/lyra",
  "/onboarding",
  "/sign-in",
  "/auth",
  "/verify",
  "/reset-password",
];

const shouldHide = (pathname: string) =>
  HIDE_ON.some((p) => (typeof p === "string" ? pathname === p || pathname.startsWith(p + "/") : p.test(pathname)));

const LyraFAB = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (shouldHide(pathname)) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/lyra")}
      aria-label="Ask Lyra"
      className="fixed z-40 right-4 md:right-6 flex items-center justify-center h-12 w-12 rounded-full shadow-elevated active:scale-95 transition-transform"
      style={{
        bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
        background: "var(--gradient-aurora)",
      }}
    >
      <Wand2 className="w-5 h-5 text-background" />
      <span className="absolute inset-0 rounded-full ring-1 ring-white/20 pointer-events-none" />
    </button>
  );
};

export default LyraFAB;