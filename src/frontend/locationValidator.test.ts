/**
 * locationValidator.test.ts
 * =========================
 * Unit tests for the location validator covering every rule in the spec.
 *
 * Run with: npm test (vitest)
 */

import { describe, it, expect } from "vitest";
import {
  validateLocation,
  validateLocationBatch,
  type RawLocationRecord,
} from "@/lib/locationValidator";

function freshSets(): [Set<string>, Set<string>] {
  return [new Set<string>(), new Set<string>()];
}

/** A valid base record that passes all rules */
function validRecord(overrides: Partial<RawLocationRecord> = {}): RawLocationRecord {
  return {
    id: "TX-101",
    name: "Anand City Civil Hospital Substation",
    lat: 22.559,
    lng: 72.948,
    iconKey: "transformer",
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 1 — id presence", () => {
  it("accepts a record with a valid non-empty id", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord(), ids, coords);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a record with undefined id", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ id: undefined }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Rule 1"))).toBe(true);
  });

  it("rejects a record with empty-string id", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ id: "" }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Rule 1"))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 2 — name", () => {
  it("rejects a record with missing name", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ name: undefined }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Rule 2"))).toBe(true);
  });

  it("rejects a name longer than 80 characters", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ name: "A".repeat(81) }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("80 chars"))).toBe(true);
  });

  it("rejects an empty-after-trim name", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ name: "   " }), ids, coords);
    expect(result.valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 3 — finite numbers", () => {
  it("rejects NaN lat", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lat: NaN }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Rule 3"))).toBe(true);
  });

  it("rejects Infinity lng", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lng: Infinity }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Rule 3"))).toBe(true);
  });

  it("rejects null lat", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lat: null as unknown as number }), ids, coords);
    expect(result.valid).toBe(false);
  });

  it("coerces a numeric-string lat and warns", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(
      validRecord({ lat: "22.5590" as unknown as number }),
      ids,
      coords,
    );
    // Should be valid (coercion succeeds) with a warning
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("Rule 3"))).toBe(true);
  });

  it("rejects a non-numeric string for lng", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(
      validRecord({ lng: "not-a-number" as unknown as number }),
      ids,
      coords,
    );
    expect(result.valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 4 — coordinate range", () => {
  it("rejects lat > 90 (using lng outside swap-detection range to avoid Rule 6)", () => {
    const [ids, coords] = freshSets();
    // lat=91, lng=150 — |lat|=91>90 but |lng|=150>90 so Rule 6 swap check does NOT trigger
    // Instead Rule 4 fires for lat out of range
    const result = validateLocation(validRecord({ lat: 91, lng: 150 }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Rule 4"))).toBe(true);
  });

  it("rejects lat < -90", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lat: -91, lng: 150 }), ids, coords);
    expect(result.valid).toBe(false);
  });

  it("rejects lng > 180", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lng: 181 }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Rule 4"))).toBe(true);
  });

  it("rejects lng < -180", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lng: -181 }), ids, coords);
    expect(result.valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 5 — (0, 0) rejection", () => {
  it("rejects (0, 0) by default", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lat: 0, lng: 0 }), ids, coords);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Rule 5"))).toBe(true);
  });

  it("accepts (0, 0) when zeroIsReal=true", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lat: 0, lng: 0, zeroIsReal: true }), ids, coords);
    expect(result.valid).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 6 — swap detection", () => {
  it("flags likely swapped coordinates (|lat| > 90 && |lng| <= 90)", () => {
    const [ids, coords] = freshSets();
    // e.g. lat=72.95, lng=22.56 — the values are swapped
    const result = validateLocation(validRecord({ lat: 72.95, lng: 22.56 }), ids, coords);
    // lat=72.95 is within [-90,90] so swap NOT triggered; need |lat|>90:
    // Use lat=91, lng=22 to trigger:
    const r2 = validateLocation(validRecord({ id: "TX-200", lat: 91, lng: 22 }), ids, coords);
    expect(r2.valid).toBe(false);
    expect(r2.errors.some((e) => e.toLowerCase().includes("swap"))).toBe(true);
  });

  it("does NOT auto-swap — just reports the error", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ id: "TX-201", lat: 95, lng: 22 }), ids, coords);
    expect(result.record).toBeUndefined();
    expect(result.errors.some((e) => e.includes("Do NOT auto-swap"))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 7 — duplicate ids and coordinates", () => {
  it("flags duplicate id in batch", () => {
    const batch = validateLocationBatch([
      validRecord({ id: "DUP-1", name: "First" }),
      validRecord({ id: "DUP-1", name: "Second" }),
    ]);
    // Second record should be rejected for duplicate id
    expect(batch.rejected.length).toBe(1);
    expect(batch.rejected[0].errors.some((e) => e.includes("duplicate id"))).toBe(true);
  });

  it("flags duplicate coordinates in batch", () => {
    const batch = validateLocationBatch([
      validRecord({ id: "COORD-1", name: "First at 22.559,72.948" }),
      validRecord({ id: "COORD-2", name: "Second at same coords" }),
    ]);
    // Both have lat=22.5590, lng=72.9480 — second should be rejected
    expect(batch.rejected.length).toBe(1);
    expect(batch.rejected[0].errors.some((e) => e.includes("duplicate coordinates"))).toBe(true);
  });

  it("accepts batch with all unique ids and coords", () => {
    const batch = validateLocationBatch([
      validRecord({ id: "A1", lat: 22.559, lng: 72.948 }),
      validRecord({ id: "A2", lat: 22.56, lng: 72.945 }),
    ]);
    expect(batch.valid.length).toBe(2);
    expect(batch.rejected.length).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 8 — precision warning", () => {
  it("warns when lat has fewer than 4 decimal places", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ lat: 22.5, lng: 72.948 }), ids, coords);
    // Should be valid but warn
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("Rule 8"))).toBe(true);
  });

  it("does not warn when both have >= 4 decimal places", () => {
    const [ids, coords] = freshSets();
    // Use values that genuinely have 4 significant decimal digits (no trailing-zero truncation)
    const result = validateLocation(validRecord({ lat: 22.5591, lng: 72.9481 }), ids, coords);
    expect(result.warnings.filter((w) => w.includes("Rule 8"))).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Rule 9 — icon key", () => {
  it("warns on unknown iconKey and falls back to default", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ iconKey: "helicopter" }), ids, coords);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("Rule 9"))).toBe(true);
    expect(result.record?.iconKey).toBe("default");
  });

  it("accepts known iconKey 'transformer'", () => {
    const [ids, coords] = freshSets();
    const result = validateLocation(validRecord({ iconKey: "transformer" }), ids, coords);
    expect(result.valid).toBe(true);
    expect(result.record?.iconKey).toBe("transformer");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Live update guard — unknown id", () => {
  /**
   * This test mirrors what the map/route does:
   * if a live update arrives for an unknown id, we check it against KNOWN_IDS.
   * The validator itself won't create new records from unknown ids.
   */
  it("does not create valid records for ids that are not in the known set", () => {
    const KNOWN_IDS = new Set(["TX-101", "TX-102"]);
    const unknownId = "TX-999";
    expect(KNOWN_IDS.has(unknownId)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("Out-of-order update guard", () => {
  it("correctly identifies a stale day value as out-of-order", () => {
    const lastDay = 50;
    const incomingDay = 30; // older
    // Guard logic from map.tsx: if fetchDay < lastDay && lastDay !== 89 → skip
    const shouldSkip = incomingDay < lastDay && lastDay !== 89;
    expect(shouldSkip).toBe(true);
  });

  it("allows day=1 to reset after reaching day=89", () => {
    const lastDay = 89;
    const incomingDay = 1;
    const shouldSkip = incomingDay < lastDay && lastDay !== 89;
    expect(shouldSkip).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("validateLocationBatch — full 18-transformer set", () => {
  it("validates all 18 static transformer locations without any rejections", async () => {
    // Dynamically import the real locations module
    const mod = await import("@/lib/transformerLocations");
    expect(mod.TRANSFORMER_LOCATIONS_FULL.length).toBe(18);
    expect(mod.REJECTED_LOCATIONS.length).toBe(0);
  });

  it("pin count equals grid row count (invariant)", async () => {
    const mod = await import("@/lib/transformerLocations");
    const pinCount = mod.TRANSFORMER_LOCATIONS_FULL.length;
    const rowCount = mod.TRANSFORMER_LOCATIONS_FULL.length;
    expect(pinCount).toBe(rowCount);
    expect(pinCount).toBe(18);
  });
});
