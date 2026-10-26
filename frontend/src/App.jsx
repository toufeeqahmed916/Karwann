import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import ResetDemoButton from "./components/ResetDemoButton.jsx";
import LanguageToggle from "./components/LanguageToggle.jsx";
import OpenDemoButton from "./components/OpenDemoButton.jsx";
import SiteChatWidget from "./components/SiteChatWidget.jsx";
import {
  clearSession,
  getSession,
  ROLE_CONFIG,
  saveSession,
} from "./lib/auth.js";
import { aiHealth } from "./lib/aiApi.js";
import { useLanguage } from "./lib/i18n.jsx";
import BrandLogo from "./components/BrandLogo.jsx";

const loadAllocation = () => import("./pages/AllocationPage.jsx");
const loadAssistant = () => import("./pages/AssistantPage.jsx");
const loadDashboard = () => import("./pages/DashboardPage.jsx");
const loadDriver = () => import("./pages/DriverPage.jsx");
const loadInventory = () => import("./pages/InventoryPage.jsx");
const loadRequester = () => import("./pages/RequesterPage.jsx");
const loadTracker = () => import("./pages/RequesterTrackerPage.jsx");
const loadRequests = () => import("./pages/RequestsPage.jsx");
const loadSimulator = () => import("./pages/SimulatorPage.jsx");

const AllocationPage = lazy(loadAllocation);
const AssistantPage = lazy(loadAssistant);
const DashboardPage = lazy(loadDashboard);
const DriverPage = lazy(loadDriver);
const InventoryPage = lazy(loadInventory);
const Karwan = lazy(() => import("./pages/Karwan.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const RequesterPage = lazy(loadRequester);
const RequesterTrackerPage = lazy(loadTracker);
const RequestsPage = lazy(loadRequests);
const SimulatorPage = lazy(loadSimulator);

const ROUTE_LOADERS = {
  "/allocation": loadAllocation,
  "/assistant": loadAssistant,
  "/dashboard": loadDashboard,
  "/driver": loadDriver,
  "/inventory": loadInventory,
  "/requester": loadRequester,
  "/tracker": loadTracker,
  "/requests": loadRequests,
  "/simulator": loadSimulator,
};

// Labels are translation keys, resolved with t() where they are shown.
const PUBLIC_NAV = {
  labelKey: "app.requesterLabel",
  links: [
    ["/requester", "nav.newRequest"],
    ["/tracker", "nav.track"],
  ],
};

function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status" aria-live="polite">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-line border-t-ink" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function ProtectedRoute({ session, role, children }) {
  const location = useLocation();

  if (!session)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (session.role !== role)
    return <Navigate to={ROLE_CONFIG[session.role].home} replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    // Wake a sleeping AI host as soon as any Karwan page opens. The website
    // remains usable if the host is unavailable or still starting.
    aiHealth().catch(() => {});
  }, []);

  useEffect(() => {
    if (location.pathname !== "/" || navigator.connection?.saveData) return undefined;
    const connection = navigator.connection?.effectiveType || "";
    if (connection.includes("2g")) return undefined;
    const warm = () => loadRequester();
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(warm, { timeout: 3000 })
      : window.setTimeout(warm, 1800);
    return () => window.requestIdleCallback
      ? window.cancelIdleCallback(id)
      : window.clearTimeout(id);
  }, [location.pathname]);

  if (location.pathname === "/") {
    return (
      <Suspense fallback={<PageLoader />}>
        <Karwan
          onSubmitRequest={() => navigate("/requester")}
          demoButton={
            <OpenDemoButton onLogin={handleLogin} onIntent={loadDashboard} className="pill outline" />
          }
        />
        <SiteChatWidget />
      </Suspense>
    );
  }
  const navigation = session ? ROLE_CONFIG[session.role] : PUBLIC_NAV;
  const showSiteHelp = ["/requester", "/tracker", "/login"].includes(
    location.pathname,
  );

  function handleLogin(account) {
    saveSession(account);
    setSession(account);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    navigate("/requester", { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <header className="relative z-[1100] flex flex-wrap items-center gap-2 border-b border-line bg-card px-3 py-2 sm:gap-4 sm:px-4">
        <NavLink
          to="/requester"
          aria-label={t("app.home")}
          className="flex shrink-0 items-center"
        >
          <BrandLogo variant="ink" height={28} />
        </NavLink>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-mute">
          {t(navigation.labelKey)}
        </span>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {navigation.links.map(([to, labelKey]) => (
            <NavLink
              key={to}
              to={to}
              onPointerEnter={ROUTE_LOADERS[to]}
              onFocus={ROUTE_LOADERS[to]}
              className={({ isActive }) =>
                `rounded-ui px-3 py-2 text-sm font-medium ${isActive ? "bg-ink text-white" : "hover:bg-paper"}`
              }
            >
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LanguageToggle />
          {session ? (
            <button
              type="button"
              className="btn-ghost shrink-0"
              onClick={handleLogout}
            >
              {t("app.logout")}
            </button>
          ) : (
            <NavLink to="/login" className="btn-ghost shrink-0">
              {t("app.login")}
            </NavLink>
          )}
          <ResetDemoButton />
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/" element={<Navigate to="/karwan" replace />} />
          <Route
            path="/login"
            element={<LoginPage session={session} onLogin={handleLogin} />}
          />
          <Route path="/requester" element={<RequesterPage />} />
          <Route path="/tracker" element={<RequesterTrackerPage />} />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute session={session} role="depot">
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute session={session} role="coordinator">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute session={session} role="coordinator">
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/allocation"
            element={
              <ProtectedRoute session={session} role="coordinator">
                <AllocationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulator"
            element={
              <ProtectedRoute session={session} role="coordinator">
                <SimulatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute session={session} role="coordinator">
                <AssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver"
            element={
              <ProtectedRoute session={session} role="driver">
                <DriverPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/requester" replace />} />
          </Routes>
        </Suspense>
      </main>
      <SiteChatWidget hidden={!showSiteHelp} />
    </div>
  );
}
