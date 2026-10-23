import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { MAP_CENTER, MAP_ZOOM, markerColor } from "../lib/constants.js";

const depotIcon = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;background:#16181D;border:3px solid #C4F135"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function ClickCatcher({ onPick }) {
  useMapEvents({ click: (e) => onPick && onPick({ lat: +e.latlng.lat.toFixed(4), lng: +e.latlng.lng.toFixed(4) }) });
  return null;
}

// Phase 1 map: request markers + depot markers + optional click-to-pick pin.
// Later phases add layers as children (routes, trucks, heat) without changing this file.
export default function MapView({ requests = [], depots = [], selectedId, onSelect, pin, onPick, height = "100%", children }) {
  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height, width: "100%" }} className="rounded-panel">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {onPick && <ClickCatcher onPick={onPick} />}
      {depots.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lng]} icon={depotIcon}>
          <Tooltip>{d.name}</Tooltip>
        </Marker>
      ))}
      {requests.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={r.id === selectedId ? 13 : 9}
          pathOptions={{ color: "#16181D", weight: r.id === selectedId ? 3 : 1, fillColor: markerColor(r), fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onSelect && onSelect(r.id) }}
        >
          <Tooltip>{r.area} (score {r.score.total})</Tooltip>
        </CircleMarker>
      ))}
      {pin && <CircleMarker center={[pin.lat, pin.lng]} radius={11} pathOptions={{ color: "#16181D", weight: 3, fillColor: "#C4F135", fillOpacity: 1 }} />}
      {children}
    </MapContainer>
  );
}
