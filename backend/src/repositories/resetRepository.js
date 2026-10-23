import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function resetDemoData() {
  const result = await supabaseAdmin.rpc("reset_demo");
  unwrapSupabaseResult(result, "reset demo data");

  // Keep older reset_demo functions compatible while ensuring that AI
  // analysis from a previous demo cannot remain attached to reset requests.
  const metadataResult = await supabaseAdmin
    .from(TABLES.requestAiMetadata)
    .delete()
    .not("request_id", "is", null);

  unwrapSupabaseResult(metadataResult, "clear AI request metadata");
}
