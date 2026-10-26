import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { authenticate, getCredentialsForRole, ROLE_CONFIG } from "../lib/auth.js";
import BrandLogo from "../components/BrandLogo.jsx";
import OpenDemoButton from "../components/OpenDemoButton.jsx";
import { useLanguage } from "../lib/i18n.jsx";

const DEFAULT_ROLE = "depot";
const DEFAULT_CREDENTIALS = getCredentialsForRole(DEFAULT_ROLE);

export default function LoginPage({ session, onLogin }) {
  const [role, setRole] = useState(DEFAULT_ROLE);
  const [username, setUsername] = useState(DEFAULT_CREDENTIALS.username);
  const [password, setPassword] = useState(DEFAULT_CREDENTIALS.password);
  const [errorKey, setErrorKey] = useState(""); // a translation key, so it follows the language
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  if (session) return <Navigate to={ROLE_CONFIG[session.role].home} replace />;

  function selectRole(nextRole) {
    const credentials = getCredentialsForRole(nextRole);
    setRole(nextRole);
    setUsername(credentials.username);
    setPassword(credentials.password);
    setErrorKey("");
  }

  function submit(event) {
    event.preventDefault();
    setErrorKey("");
    const result = authenticate(role, username, password);
    if (!result.ok) return setErrorKey(result.errorKey);

    onLogin(result.account);
    const requestedPath = location.state?.from;
    const canOpenRequestedPath = ROLE_CONFIG[role].links.some(([path]) => path === requestedPath);
    const destination = canOpenRequestedPath ? requestedPath : ROLE_CONFIG[role].home;
    navigate(destination, { replace: true });
  }

  return (
    <div className="flex min-h-full items-start justify-center px-4 py-10 sm:items-center">
      <section className="panel w-full max-w-md p-6 shadow-sm sm:p-8">
        <BrandLogo variant="ink" height={40} className="mb-5" />
        <p className="text-xs font-semibold uppercase tracking-wider text-mute">{t("login.eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{t("login.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-mute">{t("login.subtitle")}</p>

        <div className="mt-6 space-y-1">
          <OpenDemoButton onLogin={onLogin} className="btn-lime w-full" />
          <p className="text-center text-xs text-mute">{t("demo.hint")}</p>
        </div>
        <div className="mt-6 border-t border-line pt-1" />

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="label">{t("login.role")}</span>
            <select className="field" value={role} onChange={(event) => selectRole(event.target.value)}>
              <option value="depot">{t("role.depot")}</option>
              <option value="coordinator">{t("role.coordinator")}</option>
              <option value="driver">{t("role.driver")}</option>
            </select>
          </label>
          <label className="block">
            <span className="label">{t("login.account")}</span>
            <input className="field" dir="ltr" type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder={t("login.accountPlaceholder")} required />
          </label>
          <label className="block">
            <span className="label">{t("login.password")}</span>
            <input className="field" dir="ltr" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder={t("login.passwordPlaceholder")} required />
          </label>
          {errorKey && <p role="alert" className="rounded-ui border border-crit/20 bg-crit/10 px-3 py-2 text-sm text-crit">{t(errorKey)}</p>}
          <button type="submit" className="btn-primary w-full">{t("app.login")}</button>
        </form>
      </section>
    </div>
  );
}
