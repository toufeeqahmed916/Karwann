import "dotenv/config";

const REQUIRED_VARIABLES = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_JWKS_URL",
];

function requireEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePort(value) {
  const port = Number(value ?? 4000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

function parseUrl(name, value) {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}

for (const name of REQUIRED_VARIABLES) {
  requireEnvironmentVariable(name);
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  port: parsePort(process.env.PORT),
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  supabaseUrl: parseUrl("SUPABASE_URL", process.env.SUPABASE_URL),
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY.trim(),
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY.trim(),
  supabaseJwksUrl: parseUrl("SUPABASE_JWKS_URL", process.env.SUPABASE_JWKS_URL),
});
