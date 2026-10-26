import L from "leaflet";
import { Marker, Tooltip } from "react-leaflet";
import { useLang } from "../lib/i18n.jsx";

const driverIcon = L.divIcon({
  className: "karwan-truck-marker",
  html: `
    <svg style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 11 2-5h10l2 5 2 2v5h-2v2h-3v-2H8v2H5v-2H3v-5l2-2Z" fill="#2F6FDE" stroke="#2F6FDE" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M6 12h12M8 15h.01M16 15h.01" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Driver cars are shown only while a delivery is on the road (status in_transit).
export default function TruckLayer({ deliveries = [] }) {
  const { num, place, statusName } = useLang();
  return deliveries.filter((delivery) => delivery.status === "in_transit").map((delivery) => (
    <Marker key={delivery.allocationId} position={[delivery.lat, delivery.lng]} icon={driverIcon}>
      <Tooltip><span dir="auto">{place(delivery.area)} · {num(delivery.progressPct)}% · {statusName(delivery.status)}</span></Tooltip>
    </Marker>
  ));
}
