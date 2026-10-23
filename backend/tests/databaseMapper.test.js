import { describe, expect, it } from "vitest";

import {
  mapApiInput,
  mapDatabaseRow,
  mapDatabaseRows,
} from "../src/mappers/databaseMapper.js";

describe("database mappers", () => {
  it("maps nested database rows to API field names", () => {
    expect(
      mapDatabaseRow({
        daily_capacity: 2000,
        created_at: "2026-10-13T10:30:00Z",
        stock: [{ low_threshold: 300, is_low: false }],
      }),
    ).toEqual({
      dailyCapacity: 2000,
      createdAt: "2026-10-13T10:30:00Z",
      stock: [{ lowThreshold: 300, isLow: false }],
    });
  });

  it("maps API input to database field names", () => {
    expect(
      mapApiInput({
        dailyCapacity: 1500,
        currentLat: 25.39,
        items: [{ qtyNeeded: 400 }],
      }),
    ).toEqual({
      daily_capacity: 1500,
      current_lat: 25.39,
      items: [{ qty_needed: 400 }],
    });
  });

  it("maps lists of database rows", () => {
    expect(
      mapDatabaseRows([{ depot_id: "dep_01" }, { depot_id: "dep_02" }]),
    ).toEqual([{ depotId: "dep_01" }, { depotId: "dep_02" }]);
  });
});
