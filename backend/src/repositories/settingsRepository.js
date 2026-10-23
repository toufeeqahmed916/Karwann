import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

const WEIGHTS_KEY = "weights";
const TIME_OFFSET_KEY = "time_offset_hours";

export const DEFAULT_WEIGHTS = Object.freeze({
  urgency: 0.35,
  population: 0.25,
  vulnerability: 0.15,
  waiting: 0.15,
  accessibility: 0.1,
});

export async function findWeights() {
  const result = await supabaseAdmin
    .from(TABLES.settings)
    .select("value")
    .eq("key", WEIGHTS_KEY)
    .maybeSingle();

  const row = unwrapSupabaseResult(result, "read priority weights");
  return row?.value ?? { ...DEFAULT_WEIGHTS };
}

export async function saveWeights(weights) {
  const result = await supabaseAdmin
    .from(TABLES.settings)
    .upsert({ key: WEIGHTS_KEY, value: weights }, { onConflict: "key" })
    .select("value")
    .single();

  return unwrapSupabaseResult(result, "save priority weights").value;
}

export async function findTimeOffsetHours() {
  const result = await supabaseAdmin
    .from(TABLES.settings)
    .select("value")
    .eq("key", TIME_OFFSET_KEY)
    .maybeSingle();

  const value = unwrapSupabaseResult(result, "read time offset")?.value ?? 0;
  const hours = Number(value);
  return Number.isFinite(hours) ? hours : 0;
}

export async function saveTimeOffsetHours(hours) {
  const result = await supabaseAdmin
    .from(TABLES.settings)
    .upsert({ key: TIME_OFFSET_KEY, value: hours }, { onConflict: "key" })
    .select("value")
    .single();

  const value = unwrapSupabaseResult(result, "save time offset").value;
  return Number(value);
}
