import { supabaseAdmin } from "../config/supabase.js";
import { TABLES, VIEWS } from "../constants/database.js";
import { unwrapSupabaseResult } from "./databaseRepository.js";

export async function findDepots() {
  const [depotsResult, stockResult, vehiclesResult] = await Promise.all([
    supabaseAdmin.from(TABLES.depots).select("*").order("id"),
    supabaseAdmin.from(VIEWS.inventory).select("*").order("item"),
    supabaseAdmin.from(TABLES.vehicles).select("*").order("id"),
  ]);

  return {
    depots: unwrapSupabaseResult(depotsResult, "read depots"),
    stock: unwrapSupabaseResult(stockResult, "read depot inventory"),
    vehicles: unwrapSupabaseResult(vehiclesResult, "read depot vehicles"),
  };
}

export async function createDepotWithInventory({ depot, inventory, vehicles }) {
  let createdDepot;

  try {
    const depotResult = await supabaseAdmin
      .from(TABLES.depots)
      .insert(depot)
      .select("*")
      .single();
    createdDepot = unwrapSupabaseResult(depotResult, "create depot");

    const inventoryResult = await supabaseAdmin.from(TABLES.inventory).insert(
      inventory.map((entry) => ({ ...entry, depot_id: createdDepot.id })),
    );
    unwrapSupabaseResult(inventoryResult, "create depot inventory");

    const vehiclesResult = await supabaseAdmin.from(TABLES.vehicles).insert(
      vehicles.map((vehicle) => ({
        depot_id: createdDepot.id,
        name: vehicle.name,
        capacity: vehicle.capacity,
        status: "available",
        current_lat: createdDepot.lat,
        current_lng: createdDepot.lng,
      })),
    );
    unwrapSupabaseResult(vehiclesResult, "create depot vehicles");

    return createdDepot;
  } catch (error) {
    if (createdDepot?.id) {
      const rollback = await supabaseAdmin.from(TABLES.depots).delete().eq("id", createdDepot.id);
      if (rollback.error) console.error("Failed to roll back depot creation", rollback.error);
    }
    throw error;
  }
}

export async function findDepotById(id) {
  const result = await supabaseAdmin
    .from(TABLES.depots)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return unwrapSupabaseResult(result, "read depot");
}

export async function findInventoryItem(depotId, item) {
  const result = await supabaseAdmin
    .from(TABLES.inventory)
    .select("depot_id,item,qty,low_threshold")
    .eq("depot_id", depotId)
    .eq("item", item)
    .maybeSingle();

  return unwrapSupabaseResult(result, "read inventory item");
}

export async function updateInventoryAndLog({ depotId, item, oldQty, newQty, action }) {
  const updateResult = await supabaseAdmin
    .from(TABLES.inventory)
    .update({ qty: newQty })
    .eq("depot_id", depotId)
    .eq("item", item)
    .eq("qty", oldQty)
    .select("depot_id")
    .maybeSingle();
  const updated = unwrapSupabaseResult(updateResult, "update inventory item");

  if (!updated) {
    return false;
  }

  const logResult = await supabaseAdmin.from(TABLES.stockLog).insert({
    depot_id: depotId,
    request_id: null,
    item,
    qty: Math.abs(newQty - oldQty),
    action,
  });

  try {
    unwrapSupabaseResult(logResult, "write stock transaction log");
  } catch (error) {
    const rollback = await supabaseAdmin
      .from(TABLES.inventory)
      .update({ qty: oldQty })
      .eq("depot_id", depotId)
      .eq("item", item)
      .eq("qty", newQty);
    if (rollback.error) {
      console.error("Failed to roll back inventory adjustment", rollback.error);
    }
    throw error;
  }

  return true;
}

export async function updateDepotById(id, changes) {
  const result = await supabaseAdmin
    .from(TABLES.depots)
    .update(changes)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  return unwrapSupabaseResult(result, "update depot");
}

export async function findStockLog(depotId) {
  let query = supabaseAdmin
    .from(TABLES.stockLog)
    .select("id,depot_id,request_id,item,qty,action,created_at")
    .order("created_at", { ascending: false });

  if (depotId) {
    query = query.eq("depot_id", depotId);
  }

  const result = await query;
  return unwrapSupabaseResult(result, "read stock transaction log");
}

export async function createDepotVehicle(depot, input) {
  const result = await supabaseAdmin
    .from(TABLES.vehicles)
    .insert({
      depot_id: depot.id,
      name: input.name,
      capacity: input.capacity,
      status: "available",
      current_lat: depot.lat,
      current_lng: depot.lng,
    })
    .select("id")
    .single();
  return unwrapSupabaseResult(result, "create depot vehicle");
}

export async function findDepotVehicle(depotId, vehicleId) {
  const result = await supabaseAdmin
    .from(TABLES.vehicles)
    .select("id,depot_id,status")
    .eq("id", vehicleId)
    .eq("depot_id", depotId)
    .maybeSingle();
  return unwrapSupabaseResult(result, "read depot vehicle");
}

export async function updateDepotVehicleById(depotId, vehicleId, changes) {
  const result = await supabaseAdmin
    .from(TABLES.vehicles)
    .update(changes)
    .eq("id", vehicleId)
    .eq("depot_id", depotId)
    .select("id")
    .maybeSingle();
  return unwrapSupabaseResult(result, "update depot vehicle");
}

export async function deleteDepotVehicleById(depotId, vehicleId) {
  const result = await supabaseAdmin
    .from(TABLES.vehicles)
    .delete()
    .eq("id", vehicleId)
    .eq("depot_id", depotId)
    .select("id")
    .maybeSingle();
  return unwrapSupabaseResult(result, "delete depot vehicle");
}
