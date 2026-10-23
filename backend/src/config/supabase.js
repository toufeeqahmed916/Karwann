import { createClient } from "@supabase/supabase-js";

import { env } from "./env.js";

const commonOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

// Use this client for all backend database work. The secret key bypasses RLS,
// so it must never be imported by or exposed to the frontend.
export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseSecretKey,
  commonOptions,
);

// Kept for future endpoints that intentionally need the same read permissions
// as the public frontend. Phase 1 does not expose authentication endpoints.
export const supabasePublic = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey,
  commonOptions,
);
