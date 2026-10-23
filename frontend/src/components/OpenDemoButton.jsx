import { useNavigate } from "react-router-dom";
import { demoCoordinatorAccount } from "../lib/auth.js";
import { useLanguage } from "../lib/i18n.jsx";

/** Judges' shortcut: creates the same client-side coordinator session as the login form, then opens /dashboard. */
export default function OpenDemoButton({ onLogin, className = "btn-lime" }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  function open() {
    onLogin(demoCoordinatorAccount()); // App.handleLogin: saveSession + setSession
    navigate("/dashboard", { replace: true });
  }

  return <button type="button" className={className} onClick={open}>{t("demo.open")}</button>;
}
