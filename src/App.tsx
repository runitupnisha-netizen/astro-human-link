import { Suspense, lazy, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useVerificationGate } from "@/hooks/useVerificationGate";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, MessageCircleQuestion } from "lucide-react";
import Navigation from "./components/Navigation";
import PageTransition from "./components/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import BuildInfoBadge from "./components/BuildInfoBadge";
import UpdateAvailableSnackbar from "./components/UpdateAvailableSnackbar";
import EnvironmentBanner from "./components/EnvironmentBanner";
import EmailVerificationReminder from "./components/EmailVerificationReminder";
import InAppFeedback from "./components/InAppFeedback";
import CosmicNudge from "./components/CosmicNudge";
import ReleaseNotesPanel from "./components/ReleaseNotesPanel";
import SparkleLoader from "./components/SparkleLoader";
import { TranslationProvider } from "@/hooks/useTranslation";
import { AccessibilityProvider } from "@/hooks/useAccessibility";
import { captureReferralFromUrl } from "@/lib/referral";
import { useKeyboardInsets } from "@/hooks/useKeyboardInsets";

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
const ChartParity = lazy(() => import("./pages/ChartParity"));
const ChartWizard = lazy(() => import("./pages/ChartWizard"));
const ChartDrift = lazy(() => import("./pages/ChartDrift"));
const AstralAccuracy = lazy(() => import("./pages/AstralAccuracy"));
const FindMatch = lazy(() => import("./pages/FindMatch"));
const Growth = lazy(() => import("./pages/Growth"));
const DailyRitual = lazy(() => import("./pages/DailyRitual"));
const ShadowJournal = lazy(() => import("./pages/ShadowJournal"));
const MoonCycle = lazy(() => import("./pages/MoonCycle"));
const SoulmateSketch = lazy(() => import("./pages/SoulmateSketch"));
const CheckConnection = lazy(() => import("./pages/CheckConnection"));
const Admin = lazy(() => import("./pages/Admin"));
const JoinWithCode = lazy(() => import("./pages/JoinWithCode"));

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <SparkleLoader size={36} />
  </div>
);

const isPasswordResetUrl = (hash: string) => {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  return hashParams.get("type") === "recovery" && !!hashParams.get("access_token");
};

const ProtectedRoute = ({ children, allowDuringOnboarding = false, skipVerificationCheck = false }: { children: ReactNode; allowDuringOnboarding?: boolean; skipVerificationCheck?: boolean }) => {
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  const { verified, loading: verLoading } = useVerificationGate(user?.id);

  if (loading || (!skipVerificationCheck && verLoading)) return <LoadingScreen />;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (!allowDuringOnboarding && onboardingComplete === false) return <Navigate to="/onboarding" replace />;
  // After onboarding, require verification before accessing the app
  if (!skipVerificationCheck && onboardingComplete && verified === false) return <Navigate to="/verify" replace />;

  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/growth" replace />;

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

const KeyboardInsetTracker = () => {
  useKeyboardInsets();
  return null;
};

const AdminLyraProbeShortcut = () => {
  const location = useLocation();
  const { isAdmin, loading } = useIsAdmin();
  const [copied, setCopied] = useState(false);

  if (loading || !isAdmin) return null;

  const isAdminPage = location.pathname === "/admin";
  const lyraUrl = typeof window !== "undefined" ? `${window.location.origin}/admin/lyra` : "/admin/lyra";

  const copyLyraLink = async () => {
    try {
      await navigator.clipboard.writeText(lyraUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (isAdminPage) {
    return (
      <div className="fixed right-5 top-20 z-[99999] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border-2 border-violet-300 bg-white p-2 shadow-2xl shadow-violet-500/30">
        <Button asChild className="h-10 px-4 text-xs font-bold uppercase bg-violet-600 hover:bg-violet-700 text-white">
          <Link to="/admin/lyra" aria-label="Open Lyra Probe">
            <ExternalLink className="w-4 h-4 mr-2" />
            OPEN LYRA PROBE
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 px-4 text-xs font-bold uppercase border-violet-300 text-violet-800 hover:bg-violet-50"
          onClick={copyLyraLink}
        >
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? "COPIED" : "COPY LINK"}
        </Button>
      </div>
    );
  }

  if (location.pathname.startsWith("/admin")) return null;

  return (
    <Button
      asChild
      className="fixed right-4 top-24 z-[9999] h-11 px-4 text-xs font-bold uppercase shadow-lg"
    >
      <Link to="/admin/lyra" aria-label="Run Lyra Probe">
        <MessageCircleQuestion className="w-4 h-4 mr-2" />
        RUN LYRA PROBE
      </Link>
    </Button>
  );
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

const StartupAuthRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      window.localStorage.removeItem("auth-recovery-pending");
      window.sessionStorage.removeItem("auth-recovery-pending");
      if (hash.includes("access_token")) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }
    }

    if (location.pathname === "/reset-password" && !isPasswordResetUrl(hash)) {
      navigate("/sign-in", { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

const AppRoutes = () => {
  const location = useLocation();
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  const isRecoveryRoute = location.pathname === "/reset-password" && isPasswordResetUrl(location.hash);
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isVerificationRoute = location.pathname === "/verify";

  if (loading && !isRecoveryRoute) return <LoadingScreen />;

  return (
    <>
      <AnalyticsTracker />
      <ReferralCapture />
      <KeyboardInsetTracker />
      <StartupAuthRedirect />
      {!isRecoveryRoute && !isVerificationRoute && user && onboardingComplete && <AdminLyraProbeShortcut />}
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <Navigation />}
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <EmailVerificationReminder />}
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <InAppFeedback />}
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <CosmicNudge />}
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <ReleaseNotesPanel />}
      <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/sign-in" element={<PageTransition><AuthRoute><Auth /></AuthRoute></PageTransition>} />
            <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
            <Route path="/recover-access" element={<Navigate to="/sign-in" replace />} />
            <Route path="/recover-access/*" element={<Navigate to="/sign-in" replace />} />
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
            {/* Legacy routes — redirected to /profile (My Cosmos merged screen) */}
            <Route path="/inner-world" element={<Navigate to="/profile" replace />} />
            <Route path="/my-chart" element={<Navigate to="/profile" replace />} />
            <Route path="/saved-charts" element={<Navigate to="/profile" replace />} />
            <Route path="/my-cosmos" element={<Navigate to="/profile" replace />} />
            <Route path="/find-match" element={<PageTransition><ProtectedRoute><FindMatch /></ProtectedRoute></PageTransition>} />
            <Route path="/growth" element={<PageTransition><ProtectedRoute><Growth /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/ritual" element={<PageTransition><ProtectedRoute><DailyRitual /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/shadow" element={<PageTransition><ProtectedRoute><ShadowJournal /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/moon" element={<PageTransition><ProtectedRoute><MoonCycle /></ProtectedRoute></PageTransition>} />
            <Route path="/soulmate-sketch" element={<PageTransition><ProtectedRoute><SoulmateSketch /></ProtectedRoute></PageTransition>} />
            <Route path="/lyra" element={<PageTransition><ProtectedRoute><CosmicGuide /></ProtectedRoute></PageTransition>} />
            <Route path="/guide" element={<Navigate to="/lyra" replace />} />
            <Route path="/check-connection" element={<PageTransition><ProtectedRoute><CheckConnection /></ProtectedRoute></PageTransition>} />
            <Route path="/admin" element={<Suspense fallback={<LoadingScreen />}><Admin /></Suspense>} />
            <Route path="/admin/lyra" element={<Suspense fallback={<LoadingScreen />}><Admin /></Suspense>} />
            <Route path="/admin/chart-parity" element={<Suspense fallback={<LoadingScreen />}><ChartParity /></Suspense>} />
            <Route path="/admin/chart-drift" element={<Suspense fallback={<LoadingScreen />}><ChartDrift /></Suspense>} />
            <Route path="/admin/astral-accuracy" element={<Suspense fallback={<LoadingScreen />}><AstralAccuracy /></Suspense>} />
            <Route path="/chart-wizard" element={<PageTransition><ChartWizard /></PageTransition>} />
            <Route path="/join/:code" element={<PageTransition><JoinWithCode /></PageTransition>} />
            <Route path="/disclaimer" element={<PageTransition><Disclaimer /></PageTransition>} />
            <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
            <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/support" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/launch-assets" element={<PageTransition><LaunchAssets /></PageTransition>} />
            <Route path="/sms-consent" element={<PageTransition><SmsConsent /></PageTransition>} />
            <Route path="/callback/spotify" element={<PageTransition><ProtectedRoute><SpotifyCallback /></ProtectedRoute></PageTransition>} />
            <Route 
              path="/reset-password" 
              element={
                isPasswordResetUrl(window.location.hash) 
                  ? <ResetPassword /> 
                  : <Navigate to="/sign-in" replace />
              } 
            />
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
            <EnvironmentBanner />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <BuildInfoBadge />
            <UpdateAvailableSnackbar />
          </TooltipProvider>
        </QueryClientProvider>
      </TranslationProvider>
    </AccessibilityProvider>
  </ErrorBoundary>
);

export default App;
