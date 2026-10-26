import { describe, expect, it } from "vitest";
import {
  complaintSimilarity,
  distanceKm,
  normalizeComplaintText,
  reviewAuthenticity,
} from "../src/core/authenticity.js";

const now = new Date("2026-10-26T12:00:00.000Z");

function candidate(overrides = {}) {
  return {
    id: "req_previous",
    area: "Dadu",
    lat: 26.73,
    lng: 67.78,
    createdAt: "2026-10-26T10:00:00.000Z",
    complaintText: "Flood water has entered our homes and families need clean drinking water",
    ipHash: "ip-a",
    ...overrides,
  };
}

describe("request authenticity review", () => {
  it("normalizes and compares copied complaint text", () => {
    expect(normalizeComplaintText("  Need WATER!!! ")).toBe("need water");
    expect(complaintSimilarity("Need clean water now", "Need clean water now!")).toBe(1);
  });

  it("measures nearby coordinates", () => {
    expect(distanceKm({ lat: 26.73, lng: 67.78 }, { lat: 26.731, lng: 67.781 })).toBeLessThan(1);
  });

  it("flags a nearby copied request", () => {
    const review = reviewAuthenticity({
      lat: 26.731,
      lng: 67.781,
      complaintText: "Flood water has entered our homes and families need clean drinking water!",
      ipHash: "ip-b",
    }, [candidate()], now);

    expect(review.band).toBe("high");
    expect(review.flags).toContain("nearby_duplicate");
    expect(review.flags).toContain("copied_text");
    expect(review.matchedRequestIds).toEqual(["req_previous"]);
  });

  it("does not flag an unrelated request", () => {
    const review = reviewAuthenticity({
      lat: 31.52,
      lng: 74.35,
      complaintText: "A landslide has blocked the only road to our village",
      ipHash: "ip-b",
    }, [candidate()], now);

    expect(review).toMatchObject({ score: 0, band: "low", verificationStatus: "ok" });
  });

  it("flags repeated IP submissions", () => {
    const repeated = ["one", "two", "three", "four"].map((id, index) => candidate({
      id: `req_${id}`,
      lat: 24.86 + index,
      lng: 67.01 + index,
      complaintText: `Different report number ${index}`,
    }));
    const review = reviewAuthenticity({
      lat: 31.52,
      lng: 74.35,
      complaintText: "A separate situation in another city",
      ipHash: "ip-a",
    }, repeated, now);

    expect(review.flags).toContain("repeated_network");
    expect(review.verificationStatus).toBe("needs_review");
  });
});
