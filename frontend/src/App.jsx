import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import RequestsPage from "./pages/RequestsPage.jsx";
import RequesterPage from "./pages/RequesterPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AllocationPage from "./pages/AllocationPage.jsx";
import SimulatorPage from "./pages/SimulatorPage.jsx";
import AssistantPage from "./pages/AssistantPage.jsx";
import DriverPage from "./pages/DriverPage.jsx";
import RequesterTrackerPage from "./pages/RequesterTrackerPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ResetDemoButton from "./components/ResetDemoButton.jsx";
import LanguageToggle from "./components/LanguageToggle.jsx";
import OpenDemoButton from "./components/OpenDemoButton.jsx";
import SiteChatWidget from "./components/SiteChatWidget.jsx";
import { clearSession, getSession, ROLE_CONFIG, saveSession } from "./lib/auth.js";
import Karwan from "./pages/Karwan.jsx";
import BrandLogo from "./components/BrandLogo.jsx";

const PUBLIC_NAV = {
  label: "Requester",
  links: [["/requester", "New request"], ["/tracker", "Track delivery"]],
};

function ProtectedRoute({ session, role, children }) {
  const location = useLocation();

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (session.role !== role) return <Navigate to={ROLE_CONFIG[session.role].home} replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const navigate = useNavigate();
  const location = useLocation();

if (location.pathname === "/") {
  return (
    <>
      <Karwan onSubmitRequest={() => navigate("/requester")} demoButton={<OpenDemoButton onLogin={handleLogin} className="pill outline" />} />
      <SiteChatWidget />
    </>
  );
}
  const navigation = session ? ROLE_CONFIG[session.role] : PUBLIC_NAV;
  const showSiteHelp = ["/requester", "/tracker", "/login"].includes(location.pathname);

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
        <NavLink to="/requester" aria-label="Karwan home" className="flex shrink-0 items-center"><BrandLogo variant="ink" height={28} /></NavLink>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-mute">{navigation.label}</span>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {navigation.links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rounded-ui px-3 py-2 text-sm font-medium ${isActive ? "bg-ink text-white" : "hover:bg-paper"}`}>{label}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          {session ? (
            <button type="button" className="btn-ghost shrink-0" onClick={handleLogout}>Logout</button>
          ) : (
            <NavLink to="/login" className="btn-ghost shrink-0">Login</NavLink>
          )}
          <ResetDemoButton />
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/karwan" replace />} />
          <Route path="/login" element={<LoginPage session={session} onLogin={handleLogin} />} />
          <Route path="/requester" element={<RequesterPage />} />
          <Route path="/tracker" element={<RequesterTrackerPage />} />
          <Route path="/inventory" element={<ProtectedRoute session={session} role="depot"><InventoryPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute session={session} role="coordinator"><DashboardPage /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute session={session} role="coordinator"><RequestsPage /></ProtectedRoute>} />
          <Route path="/allocation" element={<ProtectedRoute session={session} role="coordinator"><AllocationPage /></ProtectedRoute>} />
          <Route path="/simulator" element={<ProtectedRoute session={session} role="coordinator"><SimulatorPage /></ProtectedRoute>} />
          <Route path="/assistant" element={<ProtectedRoute session={session} role="coordinator"><AssistantPage /></ProtectedRoute>} />
          <Route path="/driver" element={<ProtectedRoute session={session} role="driver"><DriverPage /></ProtectedRoute>} />
          
        </Routes>
      </main>
      {showSiteHelp && <SiteChatWidget />}
    </div>
  );
}
