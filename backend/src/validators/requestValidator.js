import {
  ACCESSIBILITY_LEVELS,
  REQUEST_STATUSES,
  SUPPLY_ITEMS,
  URGENCIES,
} from "../constants/enums.js";
import { AppError } from "../errors/AppError.js";

const CREATE_FIELDS = new Set([
  "area",
  "lat",
  "lng",
  "population",
  "urgency",
  "vulnerable",
  "accessibility",
  "items",
]);
const UPDATE_FIELDS = new Set(["population", "urgency"]);
const FILTER_FIELDS = new Set(["status", "item", "urgency"]);

function invalid(message) {
  throw new AppError({
    code: "VALIDATION_ERROR",
    message,
    statusCode: 400,
  });
}

function rejectUnknownFields(input, allowedFields) {
  const unknown = Object.keys(input).filter((key) => !allowedFields.has(key));
  if (unknown.length > 0) {
    invalid(`Unknown field: ${unknown[0]}`);
  }
}

function requireCoordinate(name, value, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalid(`${name} must be a number`);
  }
  if (value < minimum || value > maximum) {
    invalid(`${name} must be between ${minimum} and ${maximum}`);
  }
}

function requirePositiveInteger(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    invalid(`${name} must be a positive integer`);
  }
}

function requireEnum(name, value, allowedValues) {
  if (!allowedValues.includes(value)) {
    invalid(`${name} must be one of: ${allowedValues.join(", ")}`);
  }
}

export function validateCreateRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    invalid("Request body must be a JSON object");
  }

  rejectUnknownFields(input, CREATE_FIELDS);

  const area = typeof input.area === "string" ? input.area.trim() : "";
  if (area.length < 2 || area.length > 120) {
    invalid("area must contain between 2 and 120 characters");
  }

  requireCoordinate("lat", input.lat, -90, 90);
  requireCoordinate("lng", input.lng, -180, 180);
  requirePositiveInteger("population", input.population);
  requireEnum("urgency", input.urgency, URGENCIES);
  requireEnum("accessibility", input.accessibility, ACCESSIBILITY_LEVELS);

  if (typeof input.vulnerable !== "boolean") {
    invalid("vulnerable must be true or false");
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    invalid("At least one supply item is required");
  }

  const seenItems = new Set();
  const items = input.items.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      invalid(`items[${index}] must be an object`);
    }
    rejectUnknownFields(entry, new Set(["item", "qtyNeeded"]));
    requireEnum(`items[${index}].item`, entry.item, SUPPLY_ITEMS);
    requirePositiveInteger(`items[${index}].qtyNeeded`, entry.qtyNeeded);

    if (seenItems.has(entry.item)) {
      invalid(`Duplicate supply item: ${entry.item}`);
    }
    seenItems.add(entry.item);

    return { item: entry.item, qtyNeeded: entry.qtyNeeded };
  });

  return {
    area,
    lat: input.lat,
    lng: input.lng,
    population: input.population,
    urgency: input.urgency,
    vulnerable: input.vulnerable,
    accessibility: input.accessibility,
    items,
  };
}

export function validateUpdateRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    invalid("Request body must be a JSON object");
  }
  rejectUnknownFields(input, UPDATE_FIELDS);

  if (Object.keys(input).length === 0) {
    invalid("Provide population or urgency to update");
  }

  const update = {};
  if ("population" in input) {
    requirePositiveInteger("population", input.population);
    update.population = input.population;
  }
  if ("urgency" in input) {
    requireEnum("urgency", input.urgency, URGENCIES);
    update.urgency = input.urgency;
  }
  return update;
}

export function validateRequestFilters(query) {
  rejectUnknownFields(query, FILTER_FIELDS);

  const filters = {};
  if (query.status !== undefined) {
    requireEnum("status", query.status, REQUEST_STATUSES);
    filters.status = query.status;
  }
  if (query.item !== undefined) {
    requireEnum("item", query.item, SUPPLY_ITEMS);
    filters.item = query.item;
  }
  if (query.urgency !== undefined) {
    requireEnum("urgency", query.urgency, URGENCIES);
    filters.urgency = query.urgency;
  }
  return filters;
}
