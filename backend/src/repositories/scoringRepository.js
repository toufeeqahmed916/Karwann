import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function findRequestsForScoring() {
  const result = await supabaseAdmin.from(TABLES.requests).select(`
    id,
    area,
    lat,
    lng,
    population,
    urgency,
    vulnerable,
    accessibility,
    status,
    created_at,
    request_items (
      item,
      qty_needed,
      qty_allocated
    )
  `);

  return unwrapSupabaseResult(result, "read requests for scoring");
}
