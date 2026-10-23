import { ACCESSIBILITY_LEVELS, SUPPLY_ITEMS, URGENCIES } from "../constants/enums.js";
import { AppError } from "../errors/AppError.js";

const ACTIONS = Object.freeze([
  "reduce_stock",
  "add_stock",
  "increase_population",
  "add_request",
  "change_capacity",
  "block_zone",
]);

function invalid(message) {
  throw new AppError({ code: "VALIDATION_ERROR", message, statusCode: 400 });
}

function object(input) {
  return input && typeof input === "object" && !Array.isArray(input);
}

function exactFields(input, fields) {
  const allowed = new Set(fields);
  const unknown = Object.keys(input).find((key) => !allowed.has(key));
  if (unknown) invalid(`Unknown field: ${unknown}`);
}

function id(name, value) {
  if (typeof value !== "string" || !value.trim()) invalid(`${name} is required`);
  return value.trim();
}

function item(value) {
  if (!SUPPLY_ITEMS.includes(value)) {
    invalid(`item must be one of: ${SUPPLY_ITEMS.join(", ")}`);
  }
  return value;
}

function positive(name, value, { integer = false } = {}) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    (integer && !Number.isInteger(value))
  ) {
    invalid(`${name} must be a positive${integer ? " integer" : " number"}`);
  }
  return value;
}

function coordinate(name, value, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    invalid(`${name} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function normalizeNewRequest(request) {
  if (!object(request)) invalid("request must be a JSON object");
  exactFields(request, [
    "area", "lat", "lng", "population", "urgency", "vulnerable",
    "accessibility", "items", "item", "qtyNeeded",
  ]);
  const area = typeof request.area === "string" ? request.area.trim() : "";
  if (area.length < 2 || area.length > 120) invalid("request.area must contain between 2 and 120 characters");
  coordinate("request.lat", request.lat, -90, 90);
  coordinate("request.lng", request.lng, -180, 180);
  positive("request.population", request.population, { integer: true });
  if (!URGENCIES.includes(request.urgency)) invalid(`request.urgency must be one of: ${URGENCIES.join(", ")}`);
  if (!ACCESSIBILITY_LEVELS.includes(request.accessibility)) invalid(`request.accessibility must be one of: ${ACCESSIBILITY_LEVELS.join(", ")}`);
  if (typeof request.vulnerable !== "boolean") invalid("request.vulnerable must be true or false");

  const rawItems = Array.isArray(request.items)
    ? request.items
    : [{ item: request.item, qtyNeeded: request.qtyNeeded }];
  if (rawItems.length === 0) invalid("request must include at least one supply item");
  const seen = new Set();
  const items = rawItems.map((entry, index) => {
    if (!object(entry)) invalid(`request.items[${index}] must be an object`);
    exactFields(entry, ["item", "qtyNeeded"]);
    const supply = item(entry.item);
    positive(`request.items[${index}].qtyNeeded`, entry.qtyNeeded, { integer: true });
    if (seen.has(supply)) invalid(`Duplicate supply item: ${supply}`);
    seen.add(supply);
    return { item: supply, qtyNeeded: entry.qtyNeeded };
  });
  return { area, lat: request.lat, lng: request.lng, population: request.population, urgency: request.urgency, vulnerable: request.vulnerable, accessibility: request.accessibility, items };
}

export function validateScenarioAction(input) {
  if (!object(input)) invalid("Request body must be a JSON object");
  if (!ACTIONS.includes(input.action)) invalid(`action must be one of: ${ACTIONS.join(", ")}`);

  if (input.action === "reduce_stock") {
    exactFields(input, ["action", "depotId", "item", "percent"]);
    const percent = positive("percent", input.percent);
    if (percent > 100) invalid("percent must be at most 100");
    return { action: input.action, depotId: id("depotId", input.depotId), item: item(input.item), percent };
  }
  if (input.action === "add_stock") {
    exactFields(input, ["action", "depotId", "item", "qty"]);
    return { action: input.action, depotId: id("depotId", input.depotId), item: item(input.item), qty: positive("qty", input.qty, { integer: true }) };
  }
  if (input.action === "increase_population") {
    exactFields(input, ["action", "requestId", "percent"]);
    return { action: input.action, requestId: id("requestId", input.requestId), percent: positive("percent", input.percent) };
  }
  if (input.action === "add_request") {
    exactFields(input, ["action", "request"]);
    return { action: input.action, request: normalizeNewRequest(input.request) };
  }
  if (input.action === "change_capacity") {
    exactFields(input, ["action", "depotId", "dailyCapacity"]);
    if (!Number.isInteger(input.dailyCapacity) || input.dailyCapacity < 0) invalid("dailyCapacity must be a non-negative integer");
    return { action: input.action, depotId: id("depotId", input.depotId), dailyCapacity: input.dailyCapacity };
  }

  exactFields(input, ["action", "lat", "lng", "radiusKm"]);
  return {
    action: input.action,
    lat: coordinate("lat", input.lat, -90, 90),
    lng: coordinate("lng", input.lng, -180, 180),
    radiusKm: positive("radiusKm", input.radiusKm),
  };
}
