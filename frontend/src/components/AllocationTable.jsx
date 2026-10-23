import { ITEM_LABEL } from "../lib/constants.js";

function groupByRequest(rows) {
  const groups = new Map();

  for (const row of rows) {
    const group = groups.get(row.requestId) ?? {
      requestId: row.requestId,
      area: row.area,
      rows: [],
      items: new Map(),
      depots: new Set(),
      trucks: new Set(),
    };
    group.rows.push(row);
    group.depots.add(row.depotName);
    if (row.vehicleId) group.trucks.add(row.vehicleId);

    const item = group.items.get(row.item) ?? { item: row.item, qty: 0, qtyNeeded: 0 };
    item.qty += row.qty;
    item.qtyNeeded = Math.max(item.qtyNeeded, row.qtyNeeded);
    group.items.set(row.item, item);
    groups.set(row.requestId, group);
  }

  return [...groups.values()].map((group) => {
    const items = [...group.items.values()];
    const allocated = items.reduce((total, item) => total + item.qty, 0);
    const needed = items.reduce((total, item) => total + item.qtyNeeded, 0);
    return {
      ...group,
      items,
      allocated,
      needed,
      unfulfilled: Math.max(0, needed - allocated),
      fulfilmentPct: needed ? Math.round((allocated / needed) * 100) : 0,
      status: group.rows.every((row) => row.qty <= 0 || row.status === "approved") ? "approved" : "recommended",
    };
  });
}

export default function AllocationTable({ rows, selectedId, onSelect }) {
  const groups = groupByRequest(rows);
  if (!groups.length) return <div className="p-6 text-sm text-mute">No recommendation rows yet.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
        <thead className="bg-paper text-xs uppercase tracking-wide text-mute">
          <tr>
            <th className="px-4 py-3">Request</th>
            <th className="px-4 py-3">Supplies</th>
            <th className="px-4 py-3">Depot</th>
            <th className="px-4 py-3">Truck</th>
            <th className="px-4 py-3 text-right">Allocated</th>
            <th className="px-4 py-3 text-right">Remaining</th>
            <th className="px-4 py-3">Fulfilment</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {groups.map((group) => (
            <tr key={group.requestId} onClick={() => onSelect(group.requestId)}
              className={`cursor-pointer hover:bg-paper ${selectedId === group.requestId ? "bg-lime/20" : ""}`}>
              <td className="px-4 py-3 font-semibold">{group.area}</td>
              <td className="px-4 py-3">
                <div className="flex max-w-[300px] flex-wrap gap-1">
                  {group.items.map((item) => (
                    <span key={item.item} className="rounded bg-paper px-2 py-1 text-xs">
                      {ITEM_LABEL[item.item]} {item.qty.toLocaleString()}/{item.qtyNeeded.toLocaleString()}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">{[...group.depots].join(", ")}</td>
              <td className="px-4 py-3 text-mute">{group.trucks.size ? [...group.trucks].join(", ") : "Not assigned"}</td>
              <td className="px-4 py-3 text-right font-semibold">{group.allocated.toLocaleString()}</td>
              <td className={`px-4 py-3 text-right ${group.unfulfilled ? "font-semibold text-crit" : "text-mute"}`}>{group.unfulfilled.toLocaleString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-line"><div className="h-full bg-lime-dark" style={{ width: `${group.fulfilmentPct}%` }} /></div>
                  <strong>{group.fulfilmentPct}%</strong>
                </div>
              </td>
              <td className="px-4 py-3"><span className={`rounded-ui px-2 py-1 text-xs font-semibold capitalize ${group.status === "approved" ? "bg-done/10 text-done" : "bg-paper"}`}>{group.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
