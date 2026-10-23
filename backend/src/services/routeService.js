import { haversineKm } from "../core/allocation.js";
import { AppError } from "../errors/AppError.js";
import {
  findCachedRoute,
  findRouteEndpoints,
  saveCachedRoute,
} from "../repositories/routeRepository.js";
import { validateRouteQuery } from "../validators/routeValidator.js";

const OSRM_BASE_URL = "https://router.project-osrm.org";
const ROUTE_TIMEOUT_MS = 5000;

function mapCachedRoute(row) {
  return {
    depotId: row.depot_id,
    requestId: row.request_id,
    polyline: row.polyline,
    distanceKm: row.distance_km,
    durationMin: row.duration_min,
    estimated: row.estimated,
  };
}

function notFound(resource, id) {
  return new AppError({
    code: "NOT_FOUND",
    message: `${resource} not found: ${id}`,
    statusCode: 404,
  });
}

export function estimatedRoute(depot, request) {
  const distanceKm = Number((haversineKm(depot, request) * 1.3).toFixed(1));
  return {
    polyline: [
      [depot.lat, depot.lng],
      [request.lat, request.lng],
    ],
    distanceKm,
    durationMin: Math.round((distanceKm / 40) * 60),
    estimated: true,
  };
}

export async function fetchOsrmRoute(depot, request) {
  const coordinates = `${depot.lng},${depot.lat};${request.lng},${request.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Karwan-Relief-Optimizer/0.1" },
    signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OSRM returned HTTP ${response.status}`);
  const payload = await response.json();
  const route = payload.code === "Ok" ? payload.routes?.[0] : null;
  const coordinatesList = route?.geometry?.coordinates;
  if (!route || !Array.isArray(coordinatesList) || coordinatesList.length < 2) {
    throw new Error(`OSRM did not return a usable route (${payload.code ?? "unknown"})`);
  }
  return {
    polyline: coordinatesList.map(([lng, lat]) => [lat, lng]),
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    estimated: false,
  };
}

export async function getRoute(query) {
  const { depotId, requestId } = validateRouteQuery(query);
  const cached = await findCachedRoute(depotId, requestId);
  if (cached) return mapCachedRoute(cached);

  const endpoints = await findRouteEndpoints(depotId, requestId);
  if (!endpoints.depot) throw notFound("Depot", depotId);
  if (!endpoints.request) throw notFound("Request", requestId);

  let route;
  try {
    route = await fetchOsrmRoute(endpoints.depot, endpoints.request);
  } catch (error) {
    console.warn(`OSRM route fallback for ${depotId}/${requestId}: ${error.message}`);
    route = estimatedRoute(endpoints.depot, endpoints.request);
  }
  const result = { depotId, requestId, ...route };
  await saveCachedRoute(result);
  return result;
}
