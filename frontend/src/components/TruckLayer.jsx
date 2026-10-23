import L from "leaflet";
import { Marker, Tooltip } from "react-leaflet";

function truckIcon(delivered) {
  const color = delivered ? "#2E9D5B" : "#2F6FDE";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);color:white;font-size:15px">◆</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export default function TruckLayer({ deliveries = [] }) {
  return deliveries.map((delivery) => (
    <Marker key={delivery.allocationId} position={[delivery.lat, delivery.lng]} icon={truckIcon(delivery.status === "delivered")}>
      <Tooltip>{delivery.area} · {delivery.progressPct}% · {delivery.status.replace("_", " ")}</Tooltip>
    </Marker>
  ));
}
