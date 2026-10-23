import { SUPPLY_ITEMS, VEHICLE_STATUSES } from "../constants/enums.js";
import { AppError } from "../errors/AppError.js";

const INVENTORY_FIELDS = new Set(["item", "change", "reason"]);
const DEPOT_CREATE_FIELDS = new Set(["name", "lat", "lng", "dailyCapacity", "inventory", "vehicles"]);
const INVENTORY_CREATE_FIELDS = new Set(["item", "qty", "lowThreshold"]);
const DEPOT_FIELDS = new Set(["dailyCapacity"]);
const LOG_FILTER_FIELDS = new Set(["depotId"]);
const VEHICLE_CREATE_FIELDS = new Set(["name", "capacity"]);
const VEHICLE_UPDATE_FIELDS = new Set(["status"]);

function invalid(message) {
  throw new AppError({
    code: "VALIDATION_ERROR",
    message,
    statusCode: 400,
  });
}

function requireObject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    invalid("Request body must be a JSON object");
  }
}

function rejectUnknownFields(input, allowedFields) {
  const unknown = Object.keys(input).filter((key) => !allowedFields.has(key));
  if (unknown.length > 0) {
    invalid(`Unknown field: ${unknown[0]}`);
  }
}

export function validateInventoryAdjustment(input) {
  requireObject(input);
  rejectUnknownFields(input, INVENTORY_FIELDS);

  if (!SUPPLY_ITEMS.includes(input.item)) {
    invalid(`item must be one of: ${SUPPLY_ITEMS.join(", ")}`);
  }
  if (!Number.isInteger(input.change) || input.change === 0) {
    invalid("change must be a non-zero integer");
  }

  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < 2 || reason.length > 240) {
    invalid("reason must contain between 2 and 240 characters");
  }

  return { item: input.item, change: input.change, reason };
}

export function validateCreateDepot(input) {
  requireObject(input);
  rejectUnknownFields(input, DEPOT_CREATE_FIELDS);

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    invalid("name must contain between 2 and 120 characters");
  }
  if (typeof input.lat !== "number" || !Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90) {
    invalid("lat must be a number between -90 and 90");
  }
  if (typeof input.lng !== "number" || !Number.isFinite(input.lng) || input.lng < -180 || input.lng > 180) {
    invalid("lng must be a number between -180 and 180");
  }
  if (!Number.isInteger(input.dailyCapacity) || input.dailyCapacity < 0) {
    invalid("dailyCapacity must be a non-negative integer");
  }

  if (!Array.isArray(input.inventory) || input.inventory.length !== SUPPLY_ITEMS.length) {
    invalid(`inventory must contain exactly: ${SUPPLY_ITEMS.join(", ")}`);
  }

  const inventory = input.inventory.map((entry) => {
    requireObject(entry);
    rejectUnknownFields(entry, INVENTORY_CREATE_FIELDS);
    if (!SUPPLY_ITEMS.includes(entry.item)) {
      invalid(`item must be one of: ${SUPPLY_ITEMS.join(", ")}`);
    }
    if (!Number.isInteger(entry.qty) || entry.qty < 0) {
      invalid(`${entry.item} quantity must be a non-negative integer`);
    }
    if (!Number.isInteger(entry.lowThreshold) || entry.lowThreshold < 0) {
      invalid(`${entry.item} lowThreshold must be a non-negative integer`);
    }
    return { item: entry.item, qty: entry.qty, low_threshold: entry.lowThreshold };
  });

  const itemSet = new Set(inventory.map((entry) => entry.item));
  if (itemSet.size !== SUPPLY_ITEMS.length || SUPPLY_ITEMS.some((item) => !itemSet.has(item))) {
    invalid(`inventory must contain each item once: ${SUPPLY_ITEMS.join(", ")}`);
  }

  if (!Array.isArray(input.vehicles) || input.vehicles.length < 1 || input.vehicles.length > 20) {
    invalid("vehicles must contain between 1 and 20 trucks");
  }

  const vehicles = input.vehicles.map(validateCreateVehicle);
  return {
    depot: {
      name,
      lat: input.lat,
      lng: input.lng,
      daily_capacity: input.dailyCapacity,
    },
    inventory,
    vehicles,
  };
}

export function validateDepotUpdate(input) {
  requireObject(input);
  rejectUnknownFields(input, DEPOT_FIELDS);

  if (!Number.isInteger(input.dailyCapacity) || input.dailyCapacity < 0) {
    invalid("dailyCapacity must be a non-negative integer");
  }

  return { daily_capacity: input.dailyCapacity };
}

export function validateStockLogFilters(query = {}) {
  rejectUnknownFields(query, LOG_FILTER_FIELDS);

  if (query.depotId === undefined) {
    return {};
  }

  const depotId = typeof query.depotId === "string" ? query.depotId.trim() : "";
  if (!depotId) {
    invalid("depotId cannot be empty");
  }

  return { depotId };
}

export function validateCreateVehicle(input) {
  requireObject(input);
  rejectUnknownFields(input, VEHICLE_CREATE_FIELDS);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    invalid("name must contain between 2 and 80 characters");
  }
  if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
    invalid("capacity must be a positive integer");
  }
  return { name, capacity: input.capacity };
}

export function validateUpdateVehicle(input) {
  requireObject(input);
  rejectUnknownFields(input, VEHICLE_UPDATE_FIELDS);
  if (!VEHICLE_STATUSES.includes(input.status)) {
    invalid(`status must be one of: ${VEHICLE_STATUSES.join(", ")}`);
  }
  return { status: input.status };
}
