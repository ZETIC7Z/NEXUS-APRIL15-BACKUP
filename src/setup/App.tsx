import { ReactElement, Suspense, lazy, useEffect, useState } from "react";
import { lazyWithPreload } from "react-lazy-with-preload";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { convertLegacyUrl, isLegacyUrl } from "@/backend/metadata/getmeta";
import { generateQuickSearchMediaUrl } from "@/backend/metadata/tmdb";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AutoPWAInstallPrompt } from "@/components/AutoPWAInstallPrompt";
import { DetailsModal } from "@/components/overlays/detailsModal";
import { DisclaimerModal } from "@/components/overlays/DisclaimerModal";
import { KeyboardCommandsModal } from "@/components/overlays/KeyboardCommandsModal";
import { NotificationModal } from "@/components/overlays/notificationsModal";
import { PartnersModal } from "@/components/overlays/PartnersModal";
import { SupportInfoModal } from "@/components/overlays/SupportInfoModal";
import { useGlobalKeyboardEvents } from "@/hooks/useGlobalKeyboardEvents";
import { useOnlineListener } from "@/hooks/usePing";
import { AboutPage } from "@/pages/About";
import { AdminPage } from "@/pages/admin/AdminPage";
import { AnimePage } from "@/pages/AnimePage";
import { AllBookmarks } from "@/pages/bookmarks/AllBookmarks";
import VideoTesterView from "@/pages/developer/VideoTesterView";
import { DiscoverMore } from "@/pages/discover/AllMovieLists";
import { Discover } from "@/pages/discover/Discover";
import { MoreContent } from "@/pages/discover/MoreContent";
import MaintenancePage from "@/pages/errors/MaintenancePage";
import { NotFoundPage } from "@/pages/errors/NotFoundPage";
import { HelpPage } from "@/pages/HelpPage";
import { HomePage } from "@/pages/HomePage";
import { JipPage } from "@/pages/Jip";
import { LandingPage } from "@/pages/LandingPage";
import { LegalPage, shouldHaveLegalPage } from "@/pages/Legal";
import { LoginPage } from "@/pages/Login";
import { MigrationPage } from "@/pages/migration/Migration";
import { MigrationDirectPage } from "@/pages/migration/MigrationDirect";
import { MigrationDownloadPage } from "@/pages/migration/MigrationDownload";
import { MigrationUploadPage } from "@/pages/migration/MigrationUpload";
import { MoviesPage } from "@/pages/MoviesPage";
import { OnboardingPage } from "@/pages/onboarding/Onboarding";
import { OnboardingExtensionPage } from "@/pages/onboarding/OnboardingExtension";
import { OnboardingProxyPage } from "@/pages/onboarding/OnboardingProxy";
import { ProfileSelectionPage } from "@/pages/ProfileSelectionPage";
import { RegisterPage } from "@/pages/Register";
import { SupportPage } from "@/pages/Support";
import { TVSeriesPage } from "@/pages/TVSeriesPage";
import { WatchHistory } from "@/pages/WatchHistory";
import { Layout } from "@/setup/Layout";
import { useHistoryListener } from "@/stores/history";
import { useClearModalsOnNavigation } from "@/stores/interface/overlayStack";
import { LanguageProvider } from "@/stores/language";

const DeveloperPage = lazy(() => import("@/pages/DeveloperPage"));
const TestView = lazy(() => import("@/pages/developer/TestView"));
const PlayerView = lazyWithPreload(() => import("@/pages/PlayerView"));
const SettingsPage = lazyWithPreload(() => import("@/pages/Settings"));


PlayerView.preload();
SettingsPage.preload();

function LegacyUrlView({ children }: { children: ReactElement }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const url = location.pathname;
    if (!isLegacyUrl(url)) return;
    convertLegacyUrl(location.pathname).then((convertedUrl) => {
      navigate(convertedUrl ?? "/", { replace: true });
    });
  }, [location.pathname, navigate]);

  if (isLegacyUrl(location.pathname)) return null;
  return children;
}

function QuickSearch() {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      generateQuickSearchMediaUrl(query).then((url) => {
        navigate(url ?? "/", { replace: true });
      });
    } else {
      navigate("/", { replace: true });
    }
  }, [query, navigate]);

  return null;
}

function QueryView() {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (query) {
      navigate(`/browse/${encodeURIComponent(query)}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [query, navigate]);

  return null;
}

export const maintenanceTime = "March 31th 11:00 PM - 5:00 AM EST";

function App() {
  useHistoryListener();
  useOnlineListener();
  useGlobalKeyboardEvents();
  useClearModalsOnNavigation();
  const maintenance = false;
  const [showDowntime, setShowDowntime] = useState(maintenance);

  const handleButtonClick = () => {
    setShowDowntime(false);
  };

  useEffect(() => {
    const sessionToken = sessionStorage.getItem("downtimeToken");
    if (!sessionToken && maintenance) {
      setShowDowntime(true);
      sessionStorage.setItem("downtimeToken", "true");
    }
  }, [setShowDowntime, maintenance]);

  return (
    <Layout>
      <LanguageProvider />
      <AutoPWAInstallPrompt />
      <NotificationModal id="notifications" />
      <KeyboardCommandsModal id="keyboard-commands" />
      <SupportInfoModal id="support-info" />
      <DisclaimerModal id="disclaimer" />
      <PartnersModal id="partners" />
      <DetailsModal id="details" />
      <DetailsModal id="discover-details" />
      <DetailsModal id="player-details" />
      {!showDowntime && (
        <Routes>
          {/* Public routes - no auth required */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile-selection" element={<ProfileSelectionPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          {shouldHaveLegalPage() ? (
            <Route path="/legal" element={<LegalPage />} />
          ) : null}
          <Route path="/dmca" element={<LegalPage />} />

          {/* Functional routes */}
          <Route path="/s/:query" element={<QuickSearch />} />
          <Route path="/search/:type" element={<Navigate to="/browse" />} />
          <Route path="/search/:type/:query?" element={<QueryView />} />

          {/* Protected routes - require authentication */}
          <Route
            path="/media/:media"
            element={
              <AuthGuard>
                <LegacyUrlView>
                  <Suspense fallback={null}>
                    <PlayerView />
                  </Suspense>
                </LegacyUrlView>
              </AuthGuard>
            }
          />
          <Route
            path="/media/:media/:season/:episode"
            element={
              <AuthGuard>
                <LegacyUrlView>
                  <Suspense fallback={null}>
                    <PlayerView />
                  </Suspense>
                </LegacyUrlView>
              </AuthGuard>
            }
          />
          <Route
            path="/browse/:query?"
            element={
              <AuthGuard>
                <HomePage />
              </AuthGuard>
            }
          />
          <Route
            path="/home"
            element={
              <AuthGuard>
                <HomePage />
              </AuthGuard>
            }
          />
          <Route
            path="/movies"
            element={
              <AuthGuard>
                <MoviesPage />
              </AuthGuard>
            }
          />
          <Route
            path="/tv"
            element={
              <AuthGuard>
                <TVSeriesPage />
              </AuthGuard>
            }
          />
          <Route
            path="/anime"
            element={
              <AuthGuard>
                <AnimePage />
              </AuthGuard>
            }
          />
          <Route
            path="/my-bookmarks"
            element={
              <AuthGuard>
                <AllBookmarks />
              </AuthGuard>
            }
          />
          <Route
            path="/bookmarks"
            element={
              <AuthGuard>
                <AllBookmarks />
              </AuthGuard>
            }
          />
          <Route
            path="/watch-history"
            element={
              <AuthGuard>
                <WatchHistory />
              </AuthGuard>
            }
          />


          <Route
            path="/history"
            element={
              <AuthGuard>
                <WatchHistory />
              </AuthGuard>
            }
          />

          {/* Onboarding routes */}
          <Route
            path="/onboarding"
            element={
              <AuthGuard>
                <OnboardingPage />
              </AuthGuard>
            }
          />
          <Route
            path="/onboarding/extension"
            element={
              <AuthGuard>
                <OnboardingExtensionPage />
              </AuthGuard>
            }
          />
          <Route
            path="/onboarding/proxy"
            element={
              <AuthGuard>
                <OnboardingProxyPage />
              </AuthGuard>
            }
          />

          {/* Migration routes */}
          <Route
            path="/migration"
            element={
              <AuthGuard>
                <MigrationPage />
              </AuthGuard>
            }
          />
          <Route
            path="/migration/direct"
            element={
              <AuthGuard>
                <MigrationDirectPage />
              </AuthGuard>
            }
          />
          <Route
            path="/migration/download"
            element={
              <AuthGuard>
                <MigrationDownloadPage />
              </AuthGuard>
            }
          />
          <Route
            path="/migration/upload"
            element={
              <AuthGuard>
                <MigrationUploadPage />
              </AuthGuard>
            }
          />

          {/* Support and info */}
          <Route path="/support" element={<SupportPage />} />
          <Route path="/jip" element={<JipPage />} />

          {/* Discover routes */}
          <Route
            path="/discover"
            element={
              <AuthGuard>
                <Discover />
              </AuthGuard>
            }
          />
          <Route
            path="/discover/more/:contentType/:mediaType"
            element={
              <AuthGuard>
                <MoreContent />
              </AuthGuard>
            }
          />
          <Route
            path="/discover/more/:contentType/:id/:mediaType"
            element={
              <AuthGuard>
                <MoreContent />
              </AuthGuard>
            }
          />
          <Route
            path="/discover/more/:category"
            element={
              <AuthGuard>
                <MoreContent />
              </AuthGuard>
            }
          />
          <Route
            path="/discover/all"
            element={
              <AuthGuard>
                <DiscoverMore />
              </AuthGuard>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Suspense fallback={null}>
                  <SettingsPage />
                </Suspense>
              </AuthGuard>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <AuthGuard>
                <AdminPage />
              </AuthGuard>
            }
          />

          {/* Developer routes */}
          <Route path="/dev" element={<DeveloperPage />} />
          <Route path="/dev/video" element={<VideoTesterView />} />
          {process.env.NODE_ENV === "development" ? (
            <Route path="/dev/test" element={<TestView />} />
          ) : null}

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}
      {showDowntime && (
        <MaintenancePage onHomeButtonClick={handleButtonClick} />
      )}
    </Layout>
  );
}

export default App;
