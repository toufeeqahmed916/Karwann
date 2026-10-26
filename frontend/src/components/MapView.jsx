import { memo, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, ScaleControl, Tooltip, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { MAP_CENTER, MAP_ZOOM, markerColor } from "../lib/constants.js";
import { useLang } from "../lib/i18n.jsx";

const depotIcon = L.divIcon({
  className: "",
  html: `
    <div style="display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#16181D;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.28)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 10.5 12 4l9 6.5V21H3V10.5Z" fill="#C4F135" stroke="#C4F135" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M7 13h10M7 16h10M9 21v-5h6v5" stroke="#16181D" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const pinIcon = L.divIcon({
  className: "",
  html: `
    <div style="width:22px;height:28px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))">
      <svg width="22" height="28" viewBox="0 0 24 32" fill="none" aria-hidden="true">
        <path d="M12 1.5A10.5 10.5 0 0 0 1.5 12c0 7.7 10.5 18.5 10.5 18.5S22.5 19.7 22.5 12A10.5 10.5 0 0 0 12 1.5Z" fill="#C4F135" stroke="#16181D" stroke-width="2"/>
        <circle cx="12" cy="12" r="3.5" fill="#16181D"/>
      </svg>
    </div>`,
  iconSize: [22, 28],
  iconAnchor: [11, 28],
});

const requestIconCache = new Map();

function requestIcon(request, selected) {
  const size = selected ? 32 : 27;
  const color = markerColor(request);
  const cacheKey = `${color}:${size}`;
  if (requestIconCache.has(cacheKey)) return requestIconCache.get(cacheKey);
  const icon = L.divIcon({
    className: "",
    html: `
      <div style="display:grid;place-items:center;width:${size}px;height:${size}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))">
        <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 3 29 27H3L16 3Z" fill="${color}" stroke="#16181D" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M16 11v8" stroke="#16181D" stroke-width="3" stroke-linecap="round"/>
          <circle cx="16" cy="23" r="1.7" fill="#16181D"/>
        </svg>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  requestIconCache.set(cacheKey, icon);
  return icon;
}

const DepotMarker = memo(function DepotMarker({ depot, label }) {
  return (
    <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
      <Tooltip><span dir="auto">{label}</span></Tooltip>
    </Marker>
  );
});

const RequestMarker = memo(function RequestMarker({ request, selected, onSelect, label }) {
  const handlers = useMemo(
    () => (onSelect ? { click: () => onSelect(request.id) } : undefined),
    [onSelect, request.id],
  );
  return (
    <Marker
      position={[request.lat, request.lng]}
      icon={requestIcon(request, selected)}
      eventHandlers={handlers}
    >
      <Tooltip><span dir="auto">{label}</span></Tooltip>
    </Marker>
  );
});

function ClickCatcher({ onPick }) {
  useMapEvents({ click: (e) => onPick && onPick({ lat: +e.latlng.lat.toFixed(4), lng: +e.latlng.lng.toFixed(4) }) });
  return null;
}

function FocusPin({ pin }) {
  const map = useMap();
  useEffect(() => {
    if (pin) map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 13), { animate: true });
  }, [map, pin?.lat, pin?.lng]);
  return null;
}

// Phase 1 map: request markers + depot markers + optional click-to-pick pin.
// Later phases add layers as children (routes, trucks, heat) without changing this file.
// The map itself always stays left-to-right so panning and controls behave the same in Urdu and Sindhi;
// only the tooltip text follows the chosen language.
export default function MapView({ requests = [], depots = [], selectedId, onSelect, pin, onPick, pinCursor = false, focusPin = false, height = "100%", children }) {
  const { t, num, place } = useLang();
  return (
    <div dir="ltr" style={{ height, width: "100%" }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        zoomControl={false}
        preferCanvas
        style={{ height: "100%", width: "100%" }}
        className={`karwan-map rounded-panel${pinCursor ? " map-pick-cursor" : ""}`}
      >
        <ZoomControl position="topright" zoomInTitle={t("map.zoomIn")} zoomOutTitle={t("map.zoomOut")} />
        <ScaleControl position="bottomleft" imperial={false} />
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={2}
        />
        {onPick && <ClickCatcher onPick={onPick} />}
        {focusPin && <FocusPin pin={pin} />}
        {depots.map((d) => (
          <DepotMarker key={d.id} depot={d} label={place(d.name)} />
        ))}
        {requests.map((r) => (
          <RequestMarker
            key={r.id}
            request={r}
            selected={r.id === selectedId}
            onSelect={onSelect}
            label={t("map.requestTooltip", { area: place(r.area), score: num(r.score.total) })}
          />
        ))}
        {pin && <Marker position={[pin.lat, pin.lng]} icon={pinIcon}><Tooltip><span dir="auto">{t("map.selectedLocation")}</span></Tooltip></Marker>}
        {children}
      </MapContainer>
    </div>
  );
}
