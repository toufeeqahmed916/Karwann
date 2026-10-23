// These values mirror the CHECK constraints in schema.sql and the public API
// contract. Change them only through an approved database and contract update.
export const URGENCIES = Object.freeze(["low", "medium", "high", "critical"]);
export const ACCESSIBILITY_LEVELS = Object.freeze(["easy", "medium", "hard"]);
export const SUPPLY_ITEMS = Object.freeze(["food", "water", "medicine", "shelter"]);
export const REQUEST_STATUSES = Object.freeze([
  "pending",
  "partially_allocated",
  "allocated",
  "in_transit",
  "delivered",
]);
export const ALLOCATION_STATUSES = Object.freeze([
  "recommended",
  "approved",
  "in_transit",
  "delivered",
]);
export const VEHICLE_STATUSES = Object.freeze(["available", "busy"]);
export const SCENARIO_STATUSES = Object.freeze(["pending", "applied", "undone"]);
export const STOCK_LOG_ACTIONS = Object.freeze([
  "dispatched",
  "restocked",
  "adjusted",
]);
