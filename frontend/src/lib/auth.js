const SESSION_KEY = "karwan-staff-session";

export const ROLE_CONFIG = {
  // Labels are translation keys (see src/locales), resolved where they are shown.
  depot: { labelKey: "role.depot", home: "/inventory", links: [["/inventory", "nav.inventory"]] },
  coordinator: {
    labelKey: "role.coordinator",
    home: "/requests",
    links: [["/dashboard", "nav.dashboard"], ["/requests", "nav.requests"], ["/allocation", "nav.allocation"], ["/assistant", "nav.assistant"]],
  },
  driver: { labelKey: "role.driver", home: "/driver", links: [["/driver", "nav.delivery"]] },
};

const CREDENTIALS = {
  depot: { username: import.meta.env.VITE_DEPOT_USERNAME, password: import.meta.env.VITE_DEPOT_PASSWORD },
  coordinator: { username: import.meta.env.VITE_COORDINATOR_USERNAME, password: import.meta.env.VITE_COORDINATOR_PASSWORD },
  driver: { username: import.meta.env.VITE_DRIVER_USERNAME, password: import.meta.env.VITE_DRIVER_PASSWORD },
};

export function getCredentialsForRole(role) {
  const credentials = CREDENTIALS[role];
  return {
    username: credentials?.username || "",
    password: credentials?.password || "",
  };
}

export function authenticate(role, username, password) {
  const expected = CREDENTIALS[role];
  if (!expected?.username || !expected?.password) return { ok: false, errorKey: "login.notConfigured" };
  if (username.trim() !== expected.username || password !== expected.password) {
    return { ok: false, errorKey: "login.wrong" };
  }
  return { ok: true, account: { role, username: expected.username } };
}

/** Same shape the credential login saves, but with no password. Only for the open coordinator demo. */
export function demoCoordinatorAccount() {
  return { role: "coordinator", username: CREDENTIALS.coordinator.username || "demo-coordinator" };
}

export function getSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return session?.username && ROLE_CONFIG[session.role] ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
