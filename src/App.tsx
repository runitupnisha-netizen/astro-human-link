import { Suspense, lazy, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Navigation from "./components/Navigation";
import PageTransition from "./components/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import UpdateAvailableSnackbar from "./components/UpdateAvailableSnackbar";
import EmailVerificationReminder from "./components/EmailVerificationReminder";
import InAppFeedback from "./components/InAppFeedback";
import LyraFAB from "./components/LyraFAB";
import SparkleLoader from "./components/SparkleLoader";
import { TranslationProvider } from "@/hooks/useTranslation";
import { AccessibilityProvider } from "@/hooks/useAccessibility";
import { captureReferralFromUrl } from "@/lib/referral";
import { useKeyboardInsets } from "@/hooks/useKeyboardInsets";
import { supabase } from "@/integrations/supabase/client";
import { completeAuthRedirectFromUrl, NATIVE_AUTH_CALLBACK_URL } from "@/lib/authRedirect";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const VerificationGate = lazy(() => import("./pages/VerificationGate"));
const Discover = lazy(() => import("./pages/Discover"));
const Profile = lazy(() => import("./pages/Profile"));
const Connections = lazy(() => import("./pages/Connections"));
const Messages = lazy(() => import("./pages/Messages"));
const Settings = lazy(() => import("./pages/Settings"));
const Compatibility = lazy(() => import("./pages/Compatibility"));
const AlignmentFeed = lazy(() => import("./pages/AlignmentFeed"));
const SacredReveal = lazy(() => import("./pages/SacredReveal"));
const WeeklyInsights = lazy(() => import("./pages/WeeklyInsights"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PrivacyChecklist = lazy(() => import("./pages/PrivacyChecklist"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ViewProfile = lazy(() => import("./pages/ViewProfile"));
const WhoLikedMe = lazy(() => import("./pages/WhoLikedMe"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Premium = lazy(() => import("./pages/Premium"));
const WhoViewedMe = lazy(() => import("./pages/WhoViewedMe"));
const Referral = lazy(() => import("./pages/Referral"));
const SafetyCenter = lazy(() => import("./pages/SafetyCenter"));
const Achievements = lazy(() => import("./pages/Achievements"));
const AstroEvents = lazy(() => import("./pages/AstroEvents"));
const Contact = lazy(() => import("./pages/Contact"));
const DailyBriefing = lazy(() => import("./pages/DailyBriefing"));
const InnerWorld = lazy(() => import("./pages/InnerWorld"));
const CosmicGuide = lazy(() => import("./pages/CosmicGuide"));
const SmsConsent = lazy(() => import("./pages/SmsConsent"));
const SpotifyCallback = lazy(() => import("./pages/SpotifyCallback"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MyChart = lazy(() => import("./pages/MyChart"));
const FindMatch = lazy(() => import("./pages/FindMatch"));
const Growth = lazy(() => import("./pages/Growth"));
const Today = lazy(() => import("./pages/Today"));
const Blueprint = lazy(() => import("./pages/Blueprint"));
const BlueprintAstrology = lazy(() => import("./pages/blueprint/Astrology"));
const BlueprintHumanDesign = lazy(() => import("./pages/blueprint/HumanDesign"));
const BlueprintNumerology = lazy(() => import("./pages/blueprint/Numerology"));
const DailyRitual = lazy(() => import("./pages/DailyRitual"));
const ShadowJournal = lazy(() => import("./pages/ShadowJournal"));
const MoonCycle = lazy(() => import("./pages/MoonCycle"));
const SoulmateSketch = lazy(() => import("./pages/SoulmateSketch"));
const CheckConnection = lazy(() => import("./pages/CheckConnection"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminSmsLogs = lazy(() => import("./pages/AdminSmsLogs"));
const AdminModeration = lazy(() => import("./pages/AdminModeration"));
const JoinWithCode = lazy(() => import("./pages/JoinWithCode"));
const CallHistory = lazy(() => import("./pages/CallHistory"));
const TimeTravel = lazy(() => import("./pages/TimeTravel"));

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6" data-release={`lyra-sessions-${__BUILD_TIME__}`}>
    <SparkleLoader size={36} />
    <p className="font-display text-sm md:text-base bg-gradient-golden bg-clip-text text-transparent text-center">
      Self-discovery first. Connection follows.
    </p>
  </div>
);

const isPasswordResetUrl = (hash: string) => {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  if (hashParams.get("type") === "recovery" && !!hashParams.get("access_token")) {
    return true;
  }
  // Modern Supabase recovery emails arrive as ?code=XXX (PKCE).
  // We treat any visit to /reset-password with ?code or ?token_hash as a
  // genuine recovery attempt — the page itself exchanges the code.
  if (typeof window !== "undefined") {
    const search = new URLSearchParams(window.location.search);
    if (search.get("code") || search.get("token_hash") || search.get("type") === "recovery") {
      return true;
    }
  }
  return false;
};

const ProtectedRoute = ({ children, allowDuringOnboarding = false, skipVerificationCheck = false }: { children: ReactNode; allowDuringOnboarding?: boolean; skipVerificationCheck?: boolean }) => {
  const { user, onboardingComplete, loading } = useOnboardingStatus();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/sign-in" replace />;
  // Treat an indeterminate (null) onboarding value as still-loading rather
  // than rendering the protected child. Without this, a transient profile
  // read could flash the child UI for one frame before the guard decided
  // to redirect — the exact bounce reported on /profile and /connections.
  if (!allowDuringOnboarding && onboardingComplete === null) return <LoadingScreen />;
  if (!allowDuringOnboarding && onboardingComplete === false) return <Navigate to="/onboarding" replace />;
  // Photo/selfie verification is OPTIONAL — never a hard gate. Users can verify
  // voluntarily from Profile/Settings to earn a verified badge.
  void skipVerificationCheck;

  return <>{children}</>;
};

const OnboardingRoute = () => {
  const { user, onboardingComplete, loading } = useOnboardingStatus();

  console.log("[OnboardingRoute] guard", { loading, hasUser: !!user, onboardingComplete });

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (onboardingComplete === true) return <Navigate to="/" replace />;

  return <Onboarding />;
};

const AuthRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const FallbackRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return user ? <NotFound /> : <Navigate to="/sign-in" replace />;
};

// Admin gate — requires an authenticated user AND an `admin` row in
// user_roles. Falls back to the public NotFound for non-admins so the
// /admin/* surface area is never enumerable.
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  if (authLoading || adminLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
};

const AnalyticsTracker = () => {
  const { trackPageView } = useAnalytics();
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  return null;
};

const KeyboardInsetTracker = () => {
  useKeyboardInsets();
  return null;
};

/**
 * Captures ?ref=CODE from any URL the user lands on, stores it for 30 days,
 * and lets the onboarding reveal step redeem it for both users.
 */
const ReferralCapture = () => {
  const location = useLocation();
  useEffect(() => {
    captureReferralFromUrl();
  }, [location.pathname, location.search]);
  return null;
};

const NativeOAuthRedirectHandler = () => {
  const navigate = useNavigate();
  const handledUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrl = async (url?: string | null) => {
      if (!url || handledUrlsRef.current.has(url) || !url.startsWith(NATIVE_AUTH_CALLBACK_URL)) return;
      handledUrlsRef.current.add(url);

      try {
        await Browser.close();
      } catch {}

      try {
        const parsed = new URL(url);
        const returnedState = parsed.searchParams.get("state") || new URLSearchParams(parsed.hash.replace(/^#/, "")).get("state");
        const expectedState = sessionStorage.getItem("oauth-native-pending");
        sessionStorage.removeItem("oauth-native-pending");

        if (expectedState && returnedState && expectedState !== returnedState) {
          toast.error("Sign-in could not be verified. Please try again.");
          navigate("/sign-in", { replace: true });
          return;
        }

        const session = await completeAuthRedirectFromUrl(url);
        navigate(session ? "/" : "/sign-in", { replace: true });
      } catch {
        toast.error("Sign-in did not complete. Please try again.");
        navigate("/sign-in", { replace: true });
      }
    };

    let listener: { remove: () => void } | undefined;
    CapApp.addListener("appUrlOpen", ({ url }) => handleUrl(url)).then((handle) => {
      listener = handle;
    });
    CapApp.getLaunchUrl().then(({ url }) => handleUrl(url));

    return () => {
      listener?.remove();
    };
  }, [navigate]);

  return null;
};

const LegacyMobileLaunchRouteFix = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current || typeof window === "undefined") return;
    checkedRef.current = true;

    // Only true legacy paths — do NOT include "/profile" (live route used by the
    // Foundation checklist) or "/my-cosmos" (live route). Adding them here caused
    // taps on "Reach 80% profile score" to bounce users back to Home in the
    // Capacitor/PWA shell.
    const legacyLaunchPaths = new Set(["/inner-world", "/my-chart", "/saved-charts"]);
    const isLegacyProfileLaunch = legacyLaunchPaths.has(location.pathname) && !location.search && !location.hash;
    if (!isLegacyProfileLaunch) return;

    const isStandalonePwa =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    const isNativeShell = window.location.protocol === "capacitor:";

    if (isStandalonePwa || isNativeShell) {
      navigate("/", { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
};

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const finishSignIn = async () => {
      try {
        const session = await completeAuthRedirectFromUrl();
        navigate(session ? "/" : "/sign-in", { replace: true });
      } catch {
        navigate("/sign-in", { replace: true });
      }
    };

    finishSignIn();
  }, [navigate]);

  return <LoadingScreen />;
};

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  // Use the auth user from useOnboardingStatus / useAuth as the single
  // source of truth — we no longer hydrate the session a second time here
  // (that double-hydration created a PKCE race with useAuth).
  const authUser = user;
  const isRecoveryRoute = location.pathname === "/reset-password" && isPasswordResetUrl(location.hash);
  const isAuthCallbackRoute = location.pathname === "/auth/callback";
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isVerificationRoute = location.pathname === "/verify";
  const isOnboardingRoute = location.pathname === "/onboarding";

  useEffect(() => {
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");

    if (!isAuthCallbackRoute && !hash.includes("type=recovery")) {
      localStorage.removeItem("auth-recovery-pending");
      sessionStorage.removeItem("auth-recovery-pending");
      if (!accessToken && hash.includes("access_token")) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }
    }

    // PASSWORD_RECOVERY is the only event AppRoutes still listens for —
    // useAuth owns SIGNED_IN/SIGNED_OUT to avoid a second PKCE exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        if (window.location.hash.includes("type=recovery")) {
          navigate("/reset-password", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthCallbackRoute, isRecoveryRoute, navigate]);

  if (loading && !isRecoveryRoute) return <LoadingScreen />;

  return (
    <>
      <AnalyticsTracker />
      <ReferralCapture />
      <NativeOAuthRedirectHandler />
      <LegacyMobileLaunchRouteFix />
      <KeyboardInsetTracker />
      {!isRecoveryRoute && !isVerificationRoute && !isOnboardingRoute && !isAdminRoute && user && onboardingComplete && <Navigation />}
      {!isRecoveryRoute && !isVerificationRoute && !isOnboardingRoute && !isAdminRoute && user && onboardingComplete && <EmailVerificationReminder />}
      {!isRecoveryRoute && !isVerificationRoute && !isOnboardingRoute && !isAdminRoute && user && onboardingComplete && <InAppFeedback />}
      {!isRecoveryRoute && !isVerificationRoute && !isOnboardingRoute && !isAdminRoute && user && onboardingComplete && <LyraFAB />}
      <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/sign-in" element={<PageTransition>{authUser ? <Navigate to="/" replace /> : <Auth />}</PageTransition>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
            <Route path="/recover-access" element={<Navigate to="/sign-in" replace />} />
            <Route path="/recover-access/*" element={<Navigate to="/sign-in" replace />} />
            <Route path="/verify" element={<PageTransition><ProtectedRoute allowDuringOnboarding skipVerificationCheck><VerificationGate /></ProtectedRoute></PageTransition>} />
            <Route path="/onboarding" element={<PageTransition><OnboardingRoute /></PageTransition>} />
            <Route path="/" element={<PageTransition><ProtectedRoute><Today /></ProtectedRoute></PageTransition>} />
            <Route path="/today" element={<Navigate to="/" replace />} />
            <Route path="/discover" element={<PageTransition><ProtectedRoute><Discover /></ProtectedRoute></PageTransition>} />
            <Route path="/profile" element={<PageTransition><ProtectedRoute><Profile /></ProtectedRoute></PageTransition>} />
            <Route path="/connections" element={<PageTransition><ProtectedRoute><Connections /></ProtectedRoute></PageTransition>} />
            <Route path="/messages" element={<PageTransition><ProtectedRoute><Messages /></ProtectedRoute></PageTransition>} />
            <Route path="/calls" element={<PageTransition><ProtectedRoute><CallHistory /></ProtectedRoute></PageTransition>} />
            <Route path="/compatibility/:matchId" element={<PageTransition><ProtectedRoute><Compatibility /></ProtectedRoute></PageTransition>} />
            <Route path="/profile/:userId" element={<PageTransition><ProtectedRoute><ViewProfile /></ProtectedRoute></PageTransition>} />
            <Route path="/feed" element={<PageTransition><ProtectedRoute><AlignmentFeed /></ProtectedRoute></PageTransition>} />
            <Route path="/reveal" element={<PageTransition><ProtectedRoute><SacredReveal /></ProtectedRoute></PageTransition>} />
            <Route path="/insights" element={<PageTransition><ProtectedRoute><WeeklyInsights /></ProtectedRoute></PageTransition>} />
            <Route path="/likes" element={<PageTransition><ProtectedRoute><WhoLikedMe /></ProtectedRoute></PageTransition>} />
            <Route path="/premium" element={<PageTransition><ProtectedRoute><Premium /></ProtectedRoute></PageTransition>} />
            <Route path="/settings" element={<PageTransition><ProtectedRoute><Settings /></ProtectedRoute></PageTransition>} />
            <Route path="/views" element={<PageTransition><ProtectedRoute><WhoViewedMe /></ProtectedRoute></PageTransition>} />
            <Route path="/referral" element={<PageTransition><ProtectedRoute><Referral /></ProtectedRoute></PageTransition>} />
            <Route path="/safety" element={<PageTransition><SafetyCenter /></PageTransition>} />
            <Route path="/achievements" element={<PageTransition><ProtectedRoute><Achievements /></ProtectedRoute></PageTransition>} />
            <Route path="/astro-events" element={<PageTransition><ProtectedRoute><AstroEvents /></ProtectedRoute></PageTransition>} />
            <Route path="/briefing" element={<PageTransition><ProtectedRoute><DailyBriefing /></ProtectedRoute></PageTransition>} />
            {/* Legacy routes — redirected to /profile (My Cosmos merged screen) */}
            <Route path="/inner-world" element={<Navigate to="/profile" replace />} />
            <Route path="/my-chart" element={<Navigate to="/profile" replace />} />
            <Route path="/blueprint" element={<PageTransition><ProtectedRoute><Blueprint /></ProtectedRoute></PageTransition>} />
            <Route path="/blueprint/astrology" element={<PageTransition><ProtectedRoute><BlueprintAstrology /></ProtectedRoute></PageTransition>} />
            <Route path="/blueprint/human-design" element={<PageTransition><ProtectedRoute><BlueprintHumanDesign /></ProtectedRoute></PageTransition>} />
            <Route path="/blueprint/numerology" element={<PageTransition><ProtectedRoute><BlueprintNumerology /></ProtectedRoute></PageTransition>} />
            <Route path="/saved-charts" element={<Navigate to="/profile" replace />} />
            <Route path="/my-cosmos" element={<Navigate to="/profile" replace />} />
            <Route path="/find-match" element={<PageTransition><ProtectedRoute><FindMatch /></ProtectedRoute></PageTransition>} />
            <Route path="/growth" element={<PageTransition><ProtectedRoute skipVerificationCheck><Growth /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/ritual" element={<PageTransition><ProtectedRoute><DailyRitual /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/shadow" element={<PageTransition><ProtectedRoute><ShadowJournal /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/moon" element={<PageTransition><ProtectedRoute><MoonCycle /></ProtectedRoute></PageTransition>} />
            <Route path="/soulmate-sketch" element={<PageTransition><ProtectedRoute><SoulmateSketch /></ProtectedRoute></PageTransition>} />
            <Route path="/lyra" element={<PageTransition><ProtectedRoute skipVerificationCheck><ErrorBoundary><CosmicGuide /></ErrorBoundary></ProtectedRoute></PageTransition>} />
            <Route path="/guide" element={<Navigate to="/lyra" replace />} />
            <Route path="/check-connection" element={<PageTransition><ProtectedRoute><CheckConnection /></ProtectedRoute></PageTransition>} />
            <Route path="/time-travel" element={<PageTransition><ProtectedRoute><TimeTravel /></ProtectedRoute></PageTransition>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/lyra" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/chart-parity" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/chart-drift" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/astral-accuracy" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/sms-logs" element={<AdminRoute><AdminSmsLogs /></AdminRoute>} />
            <Route path="/admin/moderation" element={<AdminRoute><AdminModeration /></AdminRoute>} />
            <Route path="/chart-wizard" element={<Navigate to="/onboarding" replace />} />
            <Route path="/join/:code" element={<PageTransition><JoinWithCode /></PageTransition>} />
            <Route path="/disclaimer" element={<PageTransition><Disclaimer /></PageTransition>} />
            <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
            <Route path="/privacy-checklist" element={<PageTransition><PrivacyChecklist /></PageTransition>} />
            <Route path="/chart-preview" element={<Navigate to="/onboarding" replace />} />
            <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/support" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/launch-assets" element={<Navigate to="/" replace />} />
            <Route path="/sms-consent" element={<PageTransition><SmsConsent /></PageTransition>} />
            <Route path="/callback/spotify" element={<PageTransition><ProtectedRoute><SpotifyCallback /></ProtectedRoute></PageTransition>} />
            {/* Always render ResetPassword — the page self-gates against the
                presence of a recovery token/code so the link works whether
                Supabase delivers it via #access_token, ?code, or ?token_hash. */}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<PageTransition><Unsubscribe /></PageTransition>} />
            <Route path="*" element={<PageTransition><FallbackRoute /></PageTransition>} />
          </Routes>

      </Suspense>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <AccessibilityProvider>
      <TranslationProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <OfflineIndicator />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <UpdateAvailableSnackbar />
          </TooltipProvider>
        </QueryClientProvider>
      </TranslationProvider>
    </AccessibilityProvider>
  </ErrorBoundary>
);

export default App;
