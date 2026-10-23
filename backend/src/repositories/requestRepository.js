import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function createRequestWithItems(input) {
  const requestResult = await supabaseAdmin
    .from(TABLES.requests)
    .insert({
      area: input.area,
      lat: input.lat,
      lng: input.lng,
      population: input.population,
      urgency: input.urgency,
      vulnerable: input.vulnerable,
      accessibility: input.accessibility,
    })
    .select("id")
    .single();
  const request = unwrapSupabaseResult(requestResult, "create assistance request");

  const itemRows = input.items.map((entry) => ({
    request_id: request.id,
    item: entry.item,
    qty_needed: entry.qtyNeeded,
  }));

  try {
    const itemsResult = await supabaseAdmin
      .from(TABLES.requestItems)
      .insert(itemRows);
    unwrapSupabaseResult(itemsResult, "create request supply items");
  } catch (error) {
    const cleanup = await supabaseAdmin
      .from(TABLES.requests)
      .delete()
      .eq("id", request.id);
    if (cleanup.error) {
      console.error("Failed to remove incomplete request", cleanup.error);
    }
    throw error;
  }

  return request.id;
}

export async function updateRequestById(id, changes) {
  const result = await supabaseAdmin
    .from(TABLES.requests)
    .update(changes)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  return unwrapSupabaseResult(result, "update assistance request");
}

export async function findTrackingByRequestId(requestId) {
  const result = await supabaseAdmin
    .from(TABLES.allocations)
    .select(`
      id,
      item,
      status,
      progress_pct,
      eta_min,
      vehicles (
        current_lat,
        current_lng
      )
    `)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  return unwrapSupabaseResult(result, "read request tracking");
}
