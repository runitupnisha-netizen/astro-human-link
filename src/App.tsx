import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import Navigation from "./components/Navigation";
import PageTransition from "./components/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import EmailVerificationReminder from "./components/EmailVerificationReminder";
import InAppFeedback from "./components/InAppFeedback";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import Connections from "./pages/Connections";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import Compatibility from "./pages/Compatibility";
import AlignmentFeed from "./pages/AlignmentFeed";
import SacredReveal from "./pages/SacredReveal";
import WeeklyInsights from "./pages/WeeklyInsights";
import Disclaimer from "./pages/Disclaimer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ViewProfile from "./pages/ViewProfile";
import WhoLikedMe from "./pages/WhoLikedMe";
import ResetPassword from "./pages/ResetPassword";
import Premium from "./pages/Premium";
import WhoViewedMe from "./pages/WhoViewedMe";
import Referral from "./pages/Referral";
import SafetyCenter from "./pages/SafetyCenter";
import Achievements from "./pages/Achievements";
import AstroEvents from "./pages/AstroEvents";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import { TranslationProvider } from "@/hooks/useTranslation";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowDuringOnboarding = false }: { children: React.ReactNode; allowDuringOnboarding?: boolean }) => {
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!allowDuringOnboarding && onboardingComplete === false) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AnalyticsTracker = () => {
  const { trackPageView } = useAnalytics();
  const location = useLocation();
  useEffect(() => { trackPageView(location.pathname); }, [location.pathname, trackPageView]);
  return null;
};

const AppRoutes = () => {
  const { user, onboardingComplete, loading } = useOnboardingStatus();
  const location = useLocation();

  if (loading) return null;

  return (
    <>
      <AnalyticsTracker />
      {user && onboardingComplete && <Navigation />}
      {user && onboardingComplete && <EmailVerificationReminder />}
      {user && onboardingComplete && <InAppFeedback />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={<PageTransition><AuthRoute><Auth /></AuthRoute></PageTransition>} />
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
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
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
