import { Suspense, lazy, useEffect } from "react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useVerificationGate } from "@/hooks/useVerificationGate";
import Navigation from "./components/Navigation";
import PageTransition from "./components/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import EmailVerificationReminder from "./components/EmailVerificationReminder";
import InAppFeedback from "./components/InAppFeedback";
import CosmicNudge from "./components/CosmicNudge";
import ReleaseNotesPanel from "./components/ReleaseNotesPanel";
import { TranslationProvider } from "@/hooks/useTranslation";
import { AccessibilityProvider } from "@/hooks/useAccessibility";

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
const LaunchAssets = lazy(() => import("./pages/LaunchAssets"));
const CosmicGuide = lazy(() => import("./pages/CosmicGuide"));
const SmsConsent = lazy(() => import("./pages/SmsConsent"));
const SpotifyCallback = lazy(() => import("./pages/SpotifyCallback"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MyChart = lazy(() => import("./pages/MyChart"));
const FindMatch = lazy(() => import("./pages/FindMatch"));
const Growth = lazy(() => import("./pages/Growth"));
const DailyRitual = lazy(() => import("./pages/DailyRitual"));
const ShadowJournal = lazy(() => import("./pages/ShadowJournal"));
const MoonCycle = lazy(() => import("./pages/MoonCycle"));
const SoulmateSketch = lazy(() => import("./pages/SoulmateSketch"));

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const hasRecoverySignal = (location: { search: string; hash: string }) => {
  const searchParams = new URLSearchParams(location.search);

  return (
    location.hash.includes("type=recovery") ||
    location.hash.includes("access_token=") ||
    location.hash.includes("refresh_token=") ||
    searchParams.get("type") === "recovery" ||
    searchParams.get("mode") === "confirm-recovery" ||
    searchParams.get("reset") === "1"
  );
};

const ProtectedRoute = ({ children, allowDuringOnboarding = false, skipVerificationCheck = false }: { children: ReactNode; allowDuringOnboarding?: boolean; skipVerificationCheck?: boolean }) => {
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  const { verified, loading: verLoading } = useVerificationGate(user?.id);

  if (loading || (!skipVerificationCheck && verLoading)) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!allowDuringOnboarding && onboardingComplete === false) return <Navigate to="/onboarding" replace />;
  // After onboarding, require verification before accessing the app
  if (!skipVerificationCheck && onboardingComplete && verified === false) return <Navigate to="/verify" replace />;

  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AnalyticsTracker = () => {
  const { trackPageView } = useAnalytics();
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  return null;
};

const RecoveryLinkRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hasPendingRecovery = typeof window !== "undefined" && (() => {
      const sessionFlag = window.sessionStorage.getItem("auth-recovery-pending") === "true";
      const localFlag = window.localStorage.getItem("auth-recovery-pending") === "true";
      const requestedAt = Number(window.localStorage.getItem("auth-recovery-requested-at") || "0");
      const recoveryWindowActive = requestedAt > 0 && Date.now() - requestedAt < 30 * 60 * 1000;
      return sessionFlag || (localFlag && recoveryWindowActive);
    })();

    const cameFromAuthVerify =
      typeof document !== "undefined" && document.referrer.includes("/verify");
    const isRecoveryFlow =
      hasPendingRecovery ||
      hasRecoverySignal(location) ||
      cameFromAuthVerify;

    if (!isRecoveryFlow || location.pathname === "/reset-password") return;

    const nextSearch = location.search || "?reset=1";

    navigate(
      {
        pathname: "/reset-password",
        search: nextSearch,
        hash: location.hash,
      },
      { replace: true }
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "PASSWORD_RECOVERY") return;

      window.sessionStorage.setItem("auth-recovery-pending", "true");
      window.localStorage.setItem("auth-recovery-pending", "true");
      window.localStorage.setItem("auth-recovery-requested-at", Date.now().toString());

      if (window.location.pathname !== "/reset-password") {
        navigate("/reset-password", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

const AppRoutes = () => {
  const location = useLocation();
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  const isRecoveryRoute = location.pathname === "/reset-password" || hasRecoverySignal(location);

  if (loading && !isRecoveryRoute) return <LoadingScreen />;

  return (
    <>
      <AnalyticsTracker />
      <RecoveryLinkRedirect />
      {!isRecoveryRoute && user && onboardingComplete && <Navigation />}
      {!isRecoveryRoute && user && onboardingComplete && <EmailVerificationReminder />}
      {!isRecoveryRoute && user && onboardingComplete && <InAppFeedback />}
      {!isRecoveryRoute && user && onboardingComplete && <CosmicNudge />}
      {!isRecoveryRoute && user && onboardingComplete && <ReleaseNotesPanel />}
      <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/auth" element={<PageTransition><AuthRoute><Auth /></AuthRoute></PageTransition>} />
            <Route path="/verify" element={<PageTransition><ProtectedRoute allowDuringOnboarding skipVerificationCheck><VerificationGate /></ProtectedRoute></PageTransition>} />
            <Route path="/onboarding" element={<PageTransition><ProtectedRoute allowDuringOnboarding><Onboarding /></ProtectedRoute></PageTransition>} />
            <Route path="/" element={<PageTransition><ProtectedRoute><Profile /></ProtectedRoute></PageTransition>} />
            <Route path="/discover" element={<PageTransition><ProtectedRoute><Discover /></ProtectedRoute></PageTransition>} />
            <Route path="/profile" element={<PageTransition><ProtectedRoute><Profile /></ProtectedRoute></PageTransition>} />
            <Route path="/connections" element={<PageTransition><ProtectedRoute><Connections /></ProtectedRoute></PageTransition>} />
            <Route path="/messages" element={<PageTransition><ProtectedRoute><Messages /></ProtectedRoute></PageTransition>} />
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
            <Route path="/inner-world" element={<PageTransition><ProtectedRoute><InnerWorld /></ProtectedRoute></PageTransition>} />
            <Route path="/my-chart" element={<PageTransition><ProtectedRoute><MyChart /></ProtectedRoute></PageTransition>} />
            <Route path="/find-match" element={<PageTransition><ProtectedRoute><FindMatch /></ProtectedRoute></PageTransition>} />
            <Route path="/growth" element={<PageTransition><ProtectedRoute><Growth /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/ritual" element={<PageTransition><ProtectedRoute><DailyRitual /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/shadow" element={<PageTransition><ProtectedRoute><ShadowJournal /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/moon" element={<PageTransition><ProtectedRoute><MoonCycle /></ProtectedRoute></PageTransition>} />
            <Route path="/soulmate-sketch" element={<PageTransition><ProtectedRoute><SoulmateSketch /></ProtectedRoute></PageTransition>} />
            <Route path="/guide" element={<PageTransition><ProtectedRoute><CosmicGuide /></ProtectedRoute></PageTransition>} />
            <Route path="/disclaimer" element={<PageTransition><Disclaimer /></PageTransition>} />
            <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
            <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/support" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/launch-assets" element={<PageTransition><LaunchAssets /></PageTransition>} />
            <Route path="/sms-consent" element={<PageTransition><SmsConsent /></PageTransition>} />
            <Route path="/callback/spotify" element={<PageTransition><ProtectedRoute><SpotifyCallback /></ProtectedRoute></PageTransition>} />
            <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
            <Route path="/unsubscribe" element={<PageTransition><Unsubscribe /></PageTransition>} />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
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
          </TooltipProvider>
        </QueryClientProvider>
      </TranslationProvider>
    </AccessibilityProvider>
  </ErrorBoundary>
);

export default App;
