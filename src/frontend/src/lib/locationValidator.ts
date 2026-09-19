/**
 * locationValidator.ts
 * ====================
 * Validates transformer location records before they are rendered on the map
 * or inserted into the live grid.
 *
 * Rules (mirrors the Phase 2 spec):
 *  1. id present and unique
 *  2. name is non-empty trimmed string, max 80 chars
 *  3. lat / lng are finite numbers (no NaN, null, undefined, Infinity).
 *     Numeric strings are coerced and flagged as warnings.
 *  4. lat ∈ [-90, 90],  lng ∈ [-180, 180]
 *  5. Reject (0, 0) unless source explicitly marks it real
 *  6. Swap detection: |lat| > 90 && |lng| ≤ 90 → flag "likely swapped"
 *  7. Duplicate id or duplicate coordinates → flag
 *  8. Precision < 4 decimal places → warn
 *  9. Unknown pin icon/category key → warn and fall back to default
 */

export interface RawLocationRecord {
  id: unknown;
  name: unknown;
  lat: unknown;
  lng: unknown;
  /** Optional: icon/category key used to resolve an SVG pin */
  iconKey?: unknown;
  /** If true, (0,0) is treated as a legitimate location */
  zeroIsReal?: boolean;
  [key: string]: unknown;
}

export interface ValidatedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  iconKey?: string;
}

export interface ValidationResult {
  valid: boolean;
  record?: ValidatedLocation;
  errors: string[];
  warnings: string[];
}

/** Known icon keys that have corresponding SVG pins in the app */
const KNOWN_ICON_KEYS = new Set<string>(["transformer", "substation", "default"]);

/** Count decimal places in a number (up to 10 digits inspected) */
function decimalPlaces(n: number): number {
  const str = n.toString();
  const dot = str.indexOf(".");
  if (dot === -1) return 0;
  return str.length - dot - 1;
}

/**
 * Validate a single raw record.
 * Duplicate detection requires external context — pass the seenIds and seenCoords
 * sets so the caller can validate batches correctly.
 */
export function validateLocation(
  raw: RawLocationRecord,
  seenIds: Set<string>,
  seenCoords: Set<string>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1 — id present
  if (raw.id === undefined || raw.id === null || String(raw.id).trim() === "") {
    errors.push("Rule 1: id is missing or empty");
    return { valid: false, errors, warnings };
  }
  const id = String(raw.id).trim();

  // Rule 1 — id unique
  if (seenIds.has(id)) {
    errors.push(`Rule 7: duplicate id "${id}"`);
  }
  seenIds.add(id);

  // Rule 2 — name
  if (raw.name === undefined || raw.name === null) {
    errors.push("Rule 2: name is missing");
    return { valid: false, errors, warnings };
  }
  const name = String(raw.name).trim();
  if (name === "") {
    errors.push("Rule 2: name is empty after trimming");
    return { valid: false, errors, warnings };
  }
  if (name.length > 80) {
    errors.push(`Rule 2: name exceeds 80 chars (${name.length})`);
  }

  // Rule 3 — lat/lng are finite numbers (coerce strings, flag them)
  let lat: number;
  let lng: number;

  if (typeof raw.lat === "string") {
    lat = parseFloat(raw.lat);
    if (!isNaN(lat)) warnings.push("Rule 3: lat was a numeric string and was coerced to number");
  } else {
    lat = raw.lat as number;
  }

  if (typeof raw.lng === "string") {
    lng = parseFloat(raw.lng);
    if (!isNaN(lng)) warnings.push("Rule 3: lng was a numeric string and was coerced to number");
  } else {
    lng = raw.lng as number;
  }

  if (!Number.isFinite(lat)) {
    errors.push(`Rule 3: lat is not a finite number (got ${raw.lat})`);
  }
  if (!Number.isFinite(lng)) {
    errors.push(`Rule 3: lng is not a finite number (got ${raw.lng})`);
  }
  if (errors.length > 0) return { valid: false, errors, warnings };

  // Rule 6 — swap detection (before rule 4 range check)
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    errors.push(
      `Rule 6: likely swapped coordinates — |lat| (${Math.abs(lat)}) > 90 but |lng| (${Math.abs(lng)}) ≤ 90. Do NOT auto-swap; review source data.`,
    );
    return { valid: false, errors, warnings };
  }

  // Rule 4 — range
  if (lat < -90 || lat > 90) {
    errors.push(`Rule 4: lat out of range [-90, 90] (got ${lat})`);
  }
  if (lng < -180 || lng > 180) {
    errors.push(`Rule 4: lng out of range [-180, 180] (got ${lng})`);
  }
  if (errors.length > 0) return { valid: false, errors, warnings };

  // Rule 5 — reject (0,0) unless explicitly marked real
  if (lat === 0 && lng === 0 && !raw.zeroIsReal) {
    errors.push("Rule 5: coordinates (0, 0) rejected — mark zeroIsReal=true if intentional");
    return { valid: false, errors, warnings };
  }

  // Rule 7 — duplicate coordinates
  const coordKey = `${lat},${lng}`;
  if (seenCoords.has(coordKey)) {
    errors.push(`Rule 7: duplicate coordinates (${lat}, ${lng})`);
  }
  seenCoords.add(coordKey);

  // Rule 8 — precision warning
  if (decimalPlaces(lat) < 4 || decimalPlaces(lng) < 4) {
    warnings.push(
      `Rule 8: coordinate precision is under 4 decimal places (lat decimals=${decimalPlaces(lat)}, lng decimals=${decimalPlaces(lng)})`,
    );
  }

  // Rule 9 — icon key
  let iconKey: string | undefined;
  if (raw.iconKey !== undefined && raw.iconKey !== null) {
    const k = String(raw.iconKey).trim();
    if (!KNOWN_ICON_KEYS.has(k)) {
      warnings.push(`Rule 9: unknown iconKey "${k}" — falling back to default pin`);
      iconKey = "default";
    } else {
      iconKey = k;
    }
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  return {
    valid: true,
    record: { id, name, lat, lng, iconKey },
    errors,
    warnings,
  };
}

/**
 * Validate a batch of raw records.
 * Returns arrays of valid records, rejected records with reasons, and all warnings.
 */
export function validateLocationBatch(raws: RawLocationRecord[]): {
  valid: ValidatedLocation[];
  rejected: Array<{ raw: RawLocationRecord; errors: string[]; warnings: string[] }>;
  warnings: Array<{ raw: RawLocationRecord; warnings: string[] }>;
} {
  const seenIds = new Set<string>();
  const seenCoords = new Set<string>();
  const valid: ValidatedLocation[] = [];
  const rejected: Array<{ raw: RawLocationRecord; errors: string[]; warnings: string[] }> = [];
  const warnOnly: Array<{ raw: RawLocationRecord; warnings: string[] }> = [];

  for (const raw of raws) {
    const result = validateLocation(raw, seenIds, seenCoords);
    if (!result.valid) {
      rejected.push({ raw, errors: result.errors, warnings: result.warnings });
    } else {
      if (result.warnings.length > 0) {
        warnOnly.push({ raw, warnings: result.warnings });
      }
      valid.push(result.record!);
    }
  }

  return { valid, rejected, warnings: warnOnly };
}
