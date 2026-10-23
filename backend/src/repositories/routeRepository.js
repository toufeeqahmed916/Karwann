import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function findCachedRoute(depotId, requestId) {
  const result = await supabaseAdmin
    .from(TABLES.routeCache)
    .select("depot_id,request_id,polyline,distance_km,duration_min,estimated")
    .eq("depot_id", depotId)
    .eq("request_id", requestId)
    .maybeSingle();
  return unwrapSupabaseResult(result, "read cached route");
}

export async function findRouteEndpoints(depotId, requestId) {
  const [depotResult, requestResult] = await Promise.all([
    supabaseAdmin.from(TABLES.depots).select("id,lat,lng").eq("id", depotId).maybeSingle(),
    supabaseAdmin.from(TABLES.requests).select("id,lat,lng").eq("id", requestId).maybeSingle(),
  ]);
  return {
    depot: unwrapSupabaseResult(depotResult, "read route depot"),
    request: unwrapSupabaseResult(requestResult, "read route request"),
  };
}

export async function saveCachedRoute(route) {
  const result = await supabaseAdmin
    .from(TABLES.routeCache)
    .upsert(
      {
        depot_id: route.depotId,
        request_id: route.requestId,
        polyline: route.polyline,
        distance_km: route.distanceKm,
        duration_min: route.durationMin,
        estimated: route.estimated,
      },
      { onConflict: "depot_id,request_id" },
    );
  unwrapSupabaseResult(result, "cache route");
}
