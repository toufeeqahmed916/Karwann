import { AppError } from "../errors/AppError.js";
import { mapDatabaseRow, mapDatabaseRows } from "../mappers/databaseMapper.js";
import {
  createDepotVehicle,
  createDepotWithInventory,
  deleteDepotVehicleById,
  findDepotById,
  findDepotVehicle,
  findDepots,
  findInventoryItem,
  findStockLog,
  updateDepotById,
  updateDepotVehicleById,
  updateInventoryAndLog,
} from "../repositories/inventoryRepository.js";
import {
  validateCreateVehicle,
  validateCreateDepot,
  validateDepotUpdate,
  validateInventoryAdjustment,
  validateStockLogFilters,
  validateUpdateVehicle,
} from "../validators/inventoryValidator.js";

function notFound(resource, id) {
  return new AppError({
    code: "NOT_FOUND",
    message: `${resource} not found: ${id}`,
    statusCode: 404,
  });
}

function insufficientStock(available) {
  return new AppError({
    code: "INSUFFICIENT_STOCK",
    message: `Only ${available} units are available`,
    statusCode: 409,
  });
}

function assembleDepots({ depots, stock, vehicles }) {
  return depots.map((depotRow) => {
    const depot = mapDatabaseRow(depotRow);
    return {
      ...depot,
      stock: stock
        .filter((entry) => entry.depot_id === depotRow.id)
        .map(({ depot_id: _depotId, ...entry }) => mapDatabaseRow(entry)),
      vehicles: vehicles
        .filter((entry) => entry.depot_id === depotRow.id)
        .map(({ depot_id: _depotId, current_lat, current_lng, ...entry }) => ({
          ...mapDatabaseRow(entry),
          lat: current_lat,
          lng: current_lng,
        })),
    };
  });
}

export async function listDepots() {
  return assembleDepots(await findDepots());
}

export async function createDepot(input) {
  const setup = validateCreateDepot(input);
  const created = await createDepotWithInventory(setup);
  return getDepotById(created.id);
}

export async function getDepotById(id) {
  const depots = await listDepots();
  const depot = depots.find((entry) => entry.id === id);
  if (!depot) {
    throw notFound("Depot", id);
  }
  return depot;
}

export async function adjustInventory(depotId, input) {
  const adjustment = validateInventoryAdjustment(input);
  const depot = await findDepotById(depotId);
  if (!depot) {
    throw notFound("Depot", depotId);
  }

  const current = await findInventoryItem(depotId, adjustment.item);
  if (!current) {
    throw notFound("Inventory item", `${depotId}/${adjustment.item}`);
  }

  const newQty = current.qty + adjustment.change;
  if (newQty < 0) {
    throw insufficientStock(current.qty);
  }

  const updated = await updateInventoryAndLog({
    depotId,
    item: adjustment.item,
    oldQty: current.qty,
    newQty,
    action: adjustment.change > 0 ? "restocked" : "adjusted",
  });

  if (!updated) {
    const latest = await findInventoryItem(depotId, adjustment.item);
    if (!latest || latest.qty + adjustment.change < 0) {
      throw insufficientStock(latest?.qty ?? 0);
    }
    throw new AppError({
      code: "CONFLICT",
      message: "Inventory changed during this adjustment; please try again",
      statusCode: 409,
    });
  }

  return getDepotById(depotId);
}

export async function updateDepot(depotId, input) {
  const changes = validateDepotUpdate(input);
  const updated = await updateDepotById(depotId, changes);
  if (!updated) {
    throw notFound("Depot", depotId);
  }
  return getDepotById(depotId);
}

export async function listStockLog(query = {}) {
  const { depotId } = validateStockLogFilters(query);
  if (depotId && !(await findDepotById(depotId))) {
    throw notFound("Depot", depotId);
  }
  return mapDatabaseRows(await findStockLog(depotId));
}

export async function addVehicle(depotId, input) {
  const vehicle = validateCreateVehicle(input);
  const depot = await findDepotById(depotId);
  if (!depot) throw notFound("Depot", depotId);
  await createDepotVehicle(depot, vehicle);
  return getDepotById(depotId);
}

export async function updateVehicle(depotId, vehicleId, input) {
  const changes = validateUpdateVehicle(input);
  if (!(await updateDepotVehicleById(depotId, vehicleId, changes))) {
    throw notFound("Vehicle", vehicleId);
  }
  return getDepotById(depotId);
}

export async function removeVehicle(depotId, vehicleId) {
  const vehicle = await findDepotVehicle(depotId, vehicleId);
  if (!vehicle) throw notFound("Vehicle", vehicleId);
  if (vehicle.status === "busy") {
    throw new AppError({
      code: "INVALID_STATE",
      message: "A busy vehicle cannot be removed",
      statusCode: 409,
    });
  }
  await deleteDepotVehicleById(depotId, vehicleId);
  return getDepotById(depotId);
}
