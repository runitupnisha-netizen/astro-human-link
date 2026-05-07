import { Suspense, lazy, useEffect } from "react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useVerificationGate } from "@/hooks/useVerificationGate";
import Navigation from "./components/Navigation";
import PageTransition from "./components/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import UpdateAvailableSnackbar from "./components/UpdateAvailableSnackbar";
import EmailVerificationReminder from "./components/EmailVerificationReminder";
import InAppFeedback from "./components/InAppFeedback";
import CosmicNudge from "./components/CosmicNudge";
import SparkleLoader from "./components/SparkleLoader";
import { TranslationProvider } from "@/hooks/useTranslation";
import { AccessibilityProvider } from "@/hooks/useAccessibility";
import { captureReferralFromUrl } from "@/lib/referral";
import { useKeyboardInsets } from "@/hooks/useKeyboardInsets";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

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
const ChartPreview = lazy(() => import("./pages/ChartPreview"));
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
const AdminSmsLogs = lazy(() => import("./pages/AdminSmsLogs"));
const JoinWithCode = lazy(() => import("./pages/JoinWithCode"));

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <SparkleLoader size={36} />
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
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const FallbackRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return user ? <NotFound /> : <Navigate to="/sign-in" replace />;
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

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  const isRecoveryRoute = location.pathname === "/reset-password" && isPasswordResetUrl(location.hash);
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isVerificationRoute = location.pathname === "/verify";

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash.includes("type=recovery")) {
      localStorage.removeItem("auth-recovery-pending");
      sessionStorage.removeItem("auth-recovery-pending");
      if (hash.includes("access_token")) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      setAuthUser(data.session?.user || null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        localStorage.removeItem("auth-recovery-pending");
        sessionStorage.removeItem("auth-recovery-pending");
        setAuthUser(session?.user || null);
      }

      if (event === "SIGNED_OUT") {
        setAuthUser(null);
      }

      if (event === "PASSWORD_RECOVERY") {
        if (window.location.hash.includes("type=recovery")) {
          navigate("/reset-password", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!authReady || (loading && !isRecoveryRoute)) return <LoadingScreen />;

  return (
    <>
      <AnalyticsTracker />
      <ReferralCapture />
      <KeyboardInsetTracker />
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <Navigation />}
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <EmailVerificationReminder />}
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <InAppFeedback />}
      {!isRecoveryRoute && !isVerificationRoute && !isAdminRoute && user && onboardingComplete && <CosmicNudge />}
      <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/sign-in" element={<PageTransition>{authUser ? <Navigate to="/" replace /> : <Auth />}</PageTransition>} />
            <Route path="/index" element={<Navigate to="/" replace />} />
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
            <Route path="/growth" element={<PageTransition><ProtectedRoute skipVerificationCheck><Growth /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/ritual" element={<PageTransition><ProtectedRoute><DailyRitual /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/shadow" element={<PageTransition><ProtectedRoute><ShadowJournal /></ProtectedRoute></PageTransition>} />
            <Route path="/growth/moon" element={<PageTransition><ProtectedRoute><MoonCycle /></ProtectedRoute></PageTransition>} />
            <Route path="/soulmate-sketch" element={<PageTransition><ProtectedRoute><SoulmateSketch /></ProtectedRoute></PageTransition>} />
            <Route path="/lyra" element={<PageTransition><ProtectedRoute skipVerificationCheck><ErrorBoundary><CosmicGuide /></ErrorBoundary></ProtectedRoute></PageTransition>} />
            <Route path="/guide" element={<Navigate to="/lyra" replace />} />
            <Route path="/check-connection" element={<PageTransition><ProtectedRoute><CheckConnection /></ProtectedRoute></PageTransition>} />
            <Route path="/admin" element={<Suspense fallback={<LoadingScreen />}><Admin /></Suspense>} />
            <Route path="/admin/lyra" element={<Suspense fallback={<LoadingScreen />}><Admin /></Suspense>} />
            <Route path="/admin/chart-parity" element={<Suspense fallback={<LoadingScreen />}><ChartParity /></Suspense>} />
            <Route path="/admin/chart-drift" element={<Suspense fallback={<LoadingScreen />}><ChartDrift /></Suspense>} />
            <Route path="/admin/astral-accuracy" element={<Suspense fallback={<LoadingScreen />}><AstralAccuracy /></Suspense>} />
            <Route path="/admin/sms-logs" element={<Suspense fallback={<LoadingScreen />}><AdminSmsLogs /></Suspense>} />
            <Route path="/chart-wizard" element={<PageTransition><ChartWizard /></PageTransition>} />
            <Route path="/join/:code" element={<PageTransition><JoinWithCode /></PageTransition>} />
            <Route path="/disclaimer" element={<PageTransition><Disclaimer /></PageTransition>} />
            <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
            <Route path="/privacy-checklist" element={<PageTransition><PrivacyChecklist /></PageTransition>} />
            <Route path="/chart-preview" element={<PageTransition><ChartPreview /></PageTransition>} />
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
