import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function findActiveRoadBlocks() {
  const result = await supabaseAdmin
    .from(TABLES.roadBlocks)
    .select("id,lat,lng,radius_km,active")
    .eq("active", true)
    .order("created_at", { ascending: true });
  return unwrapSupabaseResult(result, "read active road blocks");
}

export async function findSavedAllocations() {
  const result = await supabaseAdmin
    .from(TABLES.allocations)
    .select(`
      id,
      request_id,
      depot_id,
      vehicle_id,
      item,
      qty,
      distance_km,
      eta_min,
      reason,
      status,
      requests (area, request_items(item, qty_needed, qty_allocated)),
      depots (name)
    `)
    .order("created_at", { ascending: true });
  return unwrapSupabaseResult(result, "read saved allocations");
}

export async function insertApprovedAllocations(rows) {
  const records = rows
    .filter((row) => row.qty > 0 && row.depotId)
    .map((row) => ({
      id: row.id,
      request_id: row.requestId,
      depot_id: row.depotId,
      vehicle_id: row.vehicleId,
      item: row.item,
      qty: row.qty,
      distance_km: row.distanceKm,
      eta_min: row.etaMin,
      reason: row.reason,
      status: "approved",
      progress_pct: 0,
    }));
  if (records.length === 0) return [];

  const result = await supabaseAdmin
    .from(TABLES.allocations)
    .insert(records)
    .select("id");
  return unwrapSupabaseResult(result, "save approved allocations");
}

export async function updateInventoryQuantity({ depotId, item, oldQty, newQty }) {
  const result = await supabaseAdmin
    .from(TABLES.inventory)
    .update({ qty: newQty })
    .eq("depot_id", depotId)
    .eq("item", item)
    .eq("qty", oldQty)
    .select("depot_id")
    .maybeSingle();
  return Boolean(unwrapSupabaseResult(result, "deduct allocated inventory"));
}

export async function insertDispatchLogs(rows) {
  const records = rows
    .filter((row) => row.qty > 0 && row.depotId)
    .map((row) => ({
      depot_id: row.depotId,
      request_id: row.requestId,
      item: row.item,
      qty: row.qty,
      action: "dispatched",
    }));
  if (records.length === 0) return;

  const result = await supabaseAdmin.from(TABLES.stockLog).insert(records);
  unwrapSupabaseResult(result, "write allocation stock log");
}

export async function updateRequestItemAllocation({ requestId, item, qtyAllocated }) {
  const result = await supabaseAdmin
    .from(TABLES.requestItems)
    .update({ qty_allocated: qtyAllocated })
    .eq("request_id", requestId)
    .eq("item", item);
  unwrapSupabaseResult(result, "update request item allocation");
}

export async function updateRequestStatus(requestId, status) {
  const result = await supabaseAdmin
    .from(TABLES.requests)
    .update({ status })
    .eq("id", requestId);
  unwrapSupabaseResult(result, "update allocated request status");
}
