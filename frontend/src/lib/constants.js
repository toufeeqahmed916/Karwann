export const URGENCY = ["low", "medium", "high", "critical"];
export const ACCESS = ["easy", "medium", "hard"];
export const ITEMS = ["food", "water", "medicine", "shelter"];
export const ITEM_LABEL = { food: "Food", water: "Water", medicine: "Medicine", shelter: "Shelter kits" };
export const STATUS_LABEL = {
  pending: "Pending", partially_allocated: "Partially allocated", allocated: "Allocated",
  in_transit: "In transit", delivered: "Delivered",
};
export const SCORE_PARTS = [
  ["urgency", "Urgency"], ["population", "Affected people"], ["vulnerability", "Vulnerable group"],
  ["waiting", "Waiting time"], ["accessibility", "Hard to reach"],
];
// Marker colour rule from USER_FLOW section 3
export function markerColor(r) {
  if (r.status === "delivered") return "#2E9D5B";
  if (r.status === "in_transit") return "#2F6FDE";
  if (r.urgency === "critical") return "#D93636";
  if (r.urgency === "high") return "#EF8A1F";
  return "#E3C21B";
}
// Sindh centre, used as the default map view
export const MAP_CENTER = [26.3, 68.2];
export const MAP_ZOOM = 7;
