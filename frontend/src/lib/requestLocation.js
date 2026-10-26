import { canonicalPlace } from "./placeNames.js";

// Approximate town centres used only to place an editable initial pin. The requester
// can always click the map to replace this with the exact affected location.
const AREA_COORDINATES = Object.freeze({
  Badin: { lat: 24.656, lng: 68.837 },
  Dadu: { lat: 26.7319, lng: 67.775 },
  Gambat: { lat: 27.3517, lng: 68.5215 },
  Hyderabad: { lat: 25.396, lng: 68.3578 },
  Jacobabad: { lat: 28.2769, lng: 68.4514 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Khairpur: { lat: 27.5295, lng: 68.7592 },
  Kotri: { lat: 25.3657, lng: 68.3083 },
  Larkana: { lat: 27.559, lng: 68.212 },
  Matiari: { lat: 25.5971, lng: 68.4467 },
  Mirpurkhas: { lat: 25.5276, lng: 69.0159 },
  Nawabshah: { lat: 26.2483, lng: 68.41 },
  Sanghar: { lat: 26.0462, lng: 68.948 },
  Sehwan: { lat: 26.4167, lng: 67.8667 },
  Sukkur: { lat: 27.7052, lng: 68.8574 },
  "Tando Allahyar": { lat: 25.46, lng: 68.7167 },
  Thatta: { lat: 24.7475, lng: 67.9239 },
});

function coordinate(value) {
  return Number(Number(value).toFixed(5));
}

export function coordinatesForArea(area) {
  const canonical = canonicalPlace(area);
  const point = canonical ? AREA_COORDINATES[canonical] : null;
  return point ? { ...point, area: canonical } : null;
}

function deviceLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Device geolocation is unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        lat: coordinate(coords.latitude),
        lng: coordinate(coords.longitude),
        accuracyKm: coordinate(coords.accuracy / 1000),
      }),
      reject,
      // A town-level initial pin does not need a slow GPS lock; the requester
      // can still place the exact point manually.
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

const geocodeCache = new Map();

export async function geocodeArea(area) {
  const local = coordinatesForArea(area);
  if (local) return local;

  const query = String(area ?? "").trim();
  if (query.length < 2) return null;
  const cacheKey = query.toLocaleLowerCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    // This is a single search after the field is completed, not autocomplete.
    const params = new URLSearchParams({
      q: `${query}, Sindh, Pakistan`,
      format: "jsonv2",
      limit: "1",
      countrycodes: "pk",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Place lookup failed");
    const [result] = await response.json();
    const lat = Number(result?.lat);
    const lng = Number(result?.lon);
    const point = Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat: coordinate(lat), lng: coordinate(lng), area: query }
      : null;
    geocodeCache.set(cacheKey, point);
    return point;
  } finally {
    clearTimeout(timeout);
  }
}

export async function findAutomaticLocation() {
  return { source: "device", point: await deviceLocation() };
}

