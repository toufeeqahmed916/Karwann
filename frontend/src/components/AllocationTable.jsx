import { useLang } from "../lib/i18n.jsx";

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
  const { t, num, place, text, itemName } = useLang();
  const groups = groupByRequest(rows);
  if (!groups.length) return <div className="p-6 text-sm text-mute">{t("allocTable.empty")}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] border-collapse text-start text-sm">
        <thead className="bg-paper text-xs uppercase tracking-wide text-mute">
          <tr>
            <th className="px-4 py-3 text-start">{t("allocTable.request")}</th>
            <th className="px-4 py-3 text-start">{t("allocTable.supplies")}</th>
            <th className="px-4 py-3 text-start">{t("allocTable.depot")}</th>
            <th className="px-4 py-3 text-start">{t("allocTable.truck")}</th>
            <th className="px-4 py-3 text-end">{t("allocTable.allocated")}</th>
            <th className="px-4 py-3 text-end">{t("allocTable.remaining")}</th>
            <th className="px-4 py-3 text-start">{t("allocTable.fulfilment")}</th>
            <th className="px-4 py-3 text-start">{t("allocTable.status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {groups.map((group) => (
            <tr key={group.requestId} onClick={() => onSelect(group.requestId)}
              className={`cursor-pointer hover:bg-paper ${selectedId === group.requestId ? "bg-lime/20" : ""}`}>
              <td className="px-4 py-3 font-semibold">{place(group.area)}</td>
              <td className="px-4 py-3">
                <div className="flex max-w-[300px] flex-wrap gap-1">
                  {group.items.map((item) => (
                    <span key={item.item} className="rounded bg-paper px-2 py-1 text-xs">
                      {itemName(item.item)} {num(item.qty)}/{num(item.qtyNeeded)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">{[...group.depots].map((depot) => (depot === "No depot available" ? t("alloc.noDepot") : place(depot))).join(t("common.listSeparator"))}</td>
              <td className="px-4 py-3 text-mute">{group.trucks.size ? [...group.trucks].map(place).join(t("common.listSeparator")) : t("allocTable.notAssigned")}</td>
              <td className="px-4 py-3 text-end font-semibold">{num(group.allocated)}</td>
              <td className={`px-4 py-3 text-end ${group.unfulfilled ? "font-semibold text-crit" : "text-mute"}`}>{num(group.unfulfilled)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-line"><div className="h-full bg-lime-dark" style={{ width: `${group.fulfilmentPct}%` }} /></div>
                  <strong dir="ltr">{group.fulfilmentPct}%</strong>
                </div>
              </td>
              <td className="px-4 py-3"><span className={`rounded-ui px-2 py-1 text-xs font-semibold ${group.status === "approved" ? "bg-done/10 text-done" : "bg-paper"}`}>{t(`allocTable.${group.status}`)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
