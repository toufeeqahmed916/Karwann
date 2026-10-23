import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

const DELIVERY_SELECT = `
  id,
  request_id,
  depot_id,
  vehicle_id,
  item,
  qty,
  distance_km,
  eta_min,
  status,
  progress_pct,
  started_at,
  created_at,
  requests (area, lat, lng),
  depots (name, lat, lng),
  vehicles (status, current_lat, current_lng)
`;

export async function findDeliveryRows(vehicleId) {
  let query = supabaseAdmin
    .from(TABLES.allocations)
    .select(DELIVERY_SELECT)
    .order("created_at", { ascending: true });
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  return unwrapSupabaseResult(await query, "read deliveries");
}

export async function updateAllocationProgress(ids, changes) {
  const result = await supabaseAdmin
    .from(TABLES.allocations)
    .update(changes)
    .in("id", ids);
  unwrapSupabaseResult(result, "update delivery progress");
}

export async function updateVehicleState(id, changes) {
  const result = await supabaseAdmin
    .from(TABLES.vehicles)
    .update(changes)
    .eq("id", id);
  unwrapSupabaseResult(result, "update delivery vehicle");
}

export async function updateDeliveryRequestStatus(id, status) {
  const result = await supabaseAdmin
    .from(TABLES.requests)
    .update({ status })
    .eq("id", id);
  unwrapSupabaseResult(result, "update delivery request");
}

export async function findRequestDeliveryState(requestId) {
  const [requestResult, allocationsResult] = await Promise.all([
    supabaseAdmin
      .from(TABLES.requests)
      .select("id,request_items(qty_needed,qty_allocated)")
      .eq("id", requestId)
      .maybeSingle(),
    supabaseAdmin
      .from(TABLES.allocations)
      .select("status")
      .eq("request_id", requestId),
  ]);
  return {
    request: unwrapSupabaseResult(requestResult, "read delivery request state"),
    allocations: unwrapSupabaseResult(
      allocationsResult,
      "read request delivery statuses",
    ),
  };
}

export async function vehicleHasInTransitAllocations(vehicleId) {
  const result = await supabaseAdmin
    .from(TABLES.allocations)
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .eq("status", "in_transit");
  if (result.error) {
    unwrapSupabaseResult(result, "check active vehicle deliveries");
  }
  return (result.count ?? 0) > 0;
}
