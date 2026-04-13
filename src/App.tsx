import { Suspense, lazy, useEffect } from "react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import { TranslationProvider } from "@/hooks/useTranslation";

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
const LaunchAssets = lazy(() => import("./pages/LaunchAssets"));
const SmsConsent = lazy(() => import("./pages/SmsConsent"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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

const AppRoutes = () => {
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  if (loading) return <LoadingScreen />;

  return (
    <>
      <AnalyticsTracker />
      {user && onboardingComplete && <Navigation />}
      {user && onboardingComplete && <EmailVerificationReminder />}
      {user && onboardingComplete && <InAppFeedback />}
      <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/auth" element={<PageTransition><AuthRoute><Auth /></AuthRoute></PageTransition>} />
            <Route path="/verify" element={<PageTransition><ProtectedRoute allowDuringOnboarding><VerificationGate /></ProtectedRoute></PageTransition>} />
            <Route path="/onboarding" element={<PageTransition><ProtectedRoute allowDuringOnboarding><Onboarding /></ProtectedRoute></PageTransition>} />
            <Route path="/" element={<PageTransition><ProtectedRoute><Discover /></ProtectedRoute></PageTransition>} />
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
            <Route path="/disclaimer" element={<PageTransition><Disclaimer /></PageTransition>} />
            <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
            <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
            <Route path="/launch-assets" element={<PageTransition><LaunchAssets /></PageTransition>} />
            <Route path="/sms-consent" element={<PageTransition><SmsConsent /></PageTransition>} />
            <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>

      </Suspense>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
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
  </ErrorBoundary>
);

export default App;
