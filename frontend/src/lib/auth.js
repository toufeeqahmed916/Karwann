const SESSION_KEY = "karwan-staff-session";

export const ROLE_CONFIG = {
  depot: { label: "Depot manager", home: "/inventory", links: [["/inventory", "Inventory"]] },
  coordinator: {
    label: "Coordinator",
    home: "/requests",
    links: [["/dashboard", "Dashboard"], ["/requests", "Requests"], ["/allocation", "Allocation"], ["/simulator", "Simulator"], ["/assistant", "Assistant"]],
  },
  driver: { label: "Driver", home: "/driver", links: [["/driver", "Delivery"]] },
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
  if (!expected?.username || !expected?.password) return { ok: false, error: "Login credentials are not configured." };
  if (username.trim() !== expected.username || password !== expected.password) {
    return { ok: false, error: "The account name or password is incorrect for the selected role." };
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
