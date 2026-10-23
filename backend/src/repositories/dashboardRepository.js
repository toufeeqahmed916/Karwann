import { supabaseAdmin } from "../config/supabase.js";
import { TABLES, VIEWS } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function findDashboardData() {
  const [requestsResult, inventoryResult, depotsResult, allocationsResult] =
    await Promise.all([
      supabaseAdmin
        .from(TABLES.requests)
        .select("id,population,status,request_items(item,qty_needed,qty_allocated)"),
      supabaseAdmin.from(VIEWS.inventory).select("depot_id,item,qty,low_threshold,is_low"),
      supabaseAdmin.from(TABLES.depots).select("id,name"),
      supabaseAdmin.from(TABLES.allocations).select("status"),
    ]);

  return {
    requests: unwrapSupabaseResult(requestsResult, "read dashboard requests"),
    inventory: unwrapSupabaseResult(inventoryResult, "read dashboard inventory"),
    depots: unwrapSupabaseResult(depotsResult, "read dashboard depots"),
    allocations: unwrapSupabaseResult(
      allocationsResult,
      "read dashboard deliveries",
    ),
  };
}
