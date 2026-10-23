import { supabaseAdmin } from "../config/supabase.js";
import { TABLES } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function savePendingScenario({ changes, before, after }) {
  const supersede = await supabaseAdmin
    .from(TABLES.scenarios)
    .update({ status: "undone" })
    .eq("status", "pending");
  unwrapSupabaseResult(supersede, "supersede pending scenarios");

  const result = await supabaseAdmin
    .from(TABLES.scenarios)
    .insert({ changes, before_rows: before, after_rows: after, status: "pending" })
    .select("id,changes,before_rows,after_rows,status,created_at")
    .single();
  return unwrapSupabaseResult(result, "save pending scenario");
}

export async function findPendingScenario() {
  const result = await supabaseAdmin
    .from(TABLES.scenarios)
    .select("id,changes,before_rows,after_rows,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return unwrapSupabaseResult(result, "read pending scenario");
}

export async function setScenarioStatus(id, status) {
  const result = await supabaseAdmin
    .from(TABLES.scenarios)
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  return unwrapSupabaseResult(result, "update scenario status");
}

export async function insertRoadBlock(block) {
  const result = await supabaseAdmin
    .from(TABLES.roadBlocks)
    .insert({
      lat: block.lat,
      lng: block.lng,
      radius_km: block.radiusKm,
      active: true,
    })
    .select("id,lat,lng,radius_km,active")
    .single();
  return unwrapSupabaseResult(result, "create road block");
}

export async function findRoadBlocks() {
  const result = await supabaseAdmin
    .from(TABLES.roadBlocks)
    .select("id,lat,lng,radius_km,active")
    .eq("active", true)
    .order("created_at", { ascending: true });
  return unwrapSupabaseResult(result, "read road blocks");
}

export async function deleteRoadBlockById(id) {
  const result = await supabaseAdmin
    .from(TABLES.roadBlocks)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  return unwrapSupabaseResult(result, "delete road block");
}
