/**
 * The hardware catalog — one admin-managed list of hardware/accessory items
 * that BOTH per-window quantities and per-user rates key off.
 *
 * Before this existed, quantities lived in five fixed `SectionConfiguration`
 * columns (lockCount, bearingCount, …) while rates lived in
 * `RateCard.hardwareRates`, and the only thing joining them was matching a
 * hardcoded label string. Adding a hardware item meant a schema migration, and
 * renaming a rate's label in the UI silently detached it from its quantity.
 *
 * Now: `HardwareItem.key` is the join. Admin owns the item list (it is global,
 * like SectionType/SectionConfiguration); each user owns the ₹ rate for each
 * item in their own RateCard.
 */

import type { HardwareRateMap } from "./hardwareRates";
import { slugifyHardwareKey } from "./hardwareRates";

export interface HardwareItemData {
  id: string;
  key: string;
  label: string;
  /** Pricing unit, e.g. "nos", "sqft", "ft". Shown next to rates and quantities. */
  unit: string;
  sortOrder: number;
  isActive: boolean;
}

/** `{ hardwareKey: quantity }`. Used both for per-window counts on a section
 * configuration and for computed totals on a calculated section. */
export type HardwareCountMap = Record<string, number>;

/** The five items whose quantities used to be fixed columns, plus the three
 * accessories that were looked up by bare label strings. Seeded as global rows.
 *
 * The keys here are exactly `slugifyHardwareKey(label)`, which is also how
 * existing `RateCard.hardwareRates` entries were keyed — so a user's saved
 * rates already line up with this catalog and need no rewriting. */
export const DEFAULT_HARDWARE_ITEMS: Omit<HardwareItemData, "id">[] = [
  { key: "lock", label: "Lock", unit: "nos", sortOrder: 0, isActive: true },
  { key: "bearing", label: "Bearing", unit: "nos", sortOrder: 1, isActive: true },
  { key: "corner", label: "Corner", unit: "nos", sortOrder: 2, isActive: true },
  { key: "pvc_connector", label: "PVC Connector", unit: "nos", sortOrder: 3, isActive: true },
  { key: "male_female_cap", label: "Male-Female Cap", unit: "nos", sortOrder: 4, isActive: true },
  { key: "track_cap", label: "Track Cap", unit: "nos", sortOrder: 5, isActive: true },
  { key: "mosquito_mesh", label: "Mosquito Mesh", unit: "nos", sortOrder: 6, isActive: true },
  { key: "pleated_mosquito_net", label: "Pleated Mosquito Net", unit: "nos", sortOrder: 7, isActive: true },
];

/** Maps each deprecated `SectionConfiguration.*Count` column to its catalog
 * key. Used by the backfill script and by `legacyHardwareCountsFromConfig`. */
export const LEGACY_HARDWARE_KEY_BY_FIELD: Record<string, string> = {
  lockCount: "lock",
  bearingCount: "bearing",
  cornerCount: "corner",
  connectorCount: "pvc_connector",
  capCount: "male_female_cap",
};

/** Maps the pre-catalog `SectionResult.accessories` field names to catalog
 * keys. Separate from the column map above because that shape is persisted
 * inside `Worksheet.data` JSON, so old worksheets still carry it. */
const LEGACY_ACCESSORY_KEY_BY_FIELD: Record<string, string> = {
  lock: "lock",
  bearing: "bearing",
  corner: "corner",
  connector: "pvc_connector",
  cap: "male_female_cap",
};

/**
 * Reads a hardware-count map, translating the pre-catalog accessory field
 * names (`lock`, `bearing`, …) onto catalog keys. Unrecognised keys pass
 * through unchanged, since a catalog key — or a user's own custom key — is
 * exactly what this map is normally keyed by.
 *
 * Only ever pass a hardware-count map here, never a whole database row: the
 * pass-through means any stray numeric field would be mistaken for a count.
 * To read the deprecated columns off a `SectionConfiguration`, use
 * `legacyHardwareCountsFromConfig`, which whitelists.
 *
 * Zero and non-finite values are dropped rather than kept as `0`, so callers
 * can treat "present in the map" as "this window actually uses this item".
 */
export function normalizeHardwareCounts(raw: unknown): HardwareCountMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const source = raw as Record<string, unknown>;
  const counts: HardwareCountMap = {};

  for (const [field, value] of Object.entries(source)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value === 0) continue;
    const key = LEGACY_ACCESSORY_KEY_BY_FIELD[field] ?? field;
    counts[key] = (counts[key] ?? 0) + value;
  }

  return counts;
}

/**
 * Reads per-window counts off the five deprecated `SectionConfiguration`
 * columns — the fallback for a configuration the backfill has not reached.
 *
 * Strictly whitelisted: a `SectionConfiguration` row is full of unrelated
 * numeric fields (deductions, multipliers), and reading it permissively turns
 * every one of them into a phantom hardware line.
 */
export function legacyHardwareCountsFromConfig(row: unknown): HardwareCountMap {
  if (!row || typeof row !== "object") return {};

  const source = row as Record<string, unknown>;
  const counts: HardwareCountMap = {};

  for (const [field, key] of Object.entries(LEGACY_HARDWARE_KEY_BY_FIELD)) {
    const value = source[field];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      counts[key] = value;
    }
  }

  return counts;
}

/** Adds `additional` into `base`, in place, dropping nothing. */
export function addHardwareCounts(base: HardwareCountMap, additional: HardwareCountMap): void {
  for (const [key, value] of Object.entries(additional)) {
    base[key] = (base[key] ?? 0) + value;
  }
}

/** Multiplies every count by `factor` — how per-window counts become per-order. */
export function scaleHardwareCounts(counts: HardwareCountMap, factor: number): HardwareCountMap {
  const scaled: HardwareCountMap = {};
  for (const [key, value] of Object.entries(counts)) {
    scaled[key] = value * factor;
  }
  return scaled;
}

/** Indexes a catalog by key for O(1) lookup while building line items. */
export function indexHardwareByKey(items: HardwareItemData[]): Record<string, HardwareItemData> {
  const byKey: Record<string, HardwareItemData> = {};
  items.forEach((item) => {
    byKey[item.key] = item;
  });
  return byKey;
}

/**
 * Resolves the ₹ rate for a catalog item from a user's RateCard.
 *
 * Prefers a direct key hit. Falls back to matching the item's label, which
 * covers rate cards written before the catalog existed where the user had
 * typed their own label that slugified to a different key (e.g. "Locks" →
 * `locks`, which will never key-match the catalog's `lock`).
 */
export function resolveHardwareRate(
  rates: HardwareRateMap | undefined,
  item: Pick<HardwareItemData, "key" | "label">
): number {
  if (!rates) return 0;

  const direct = rates[item.key];
  if (direct) return direct.rate;

  const wanted = slugifyHardwareKey(item.label);
  for (const [key, entry] of Object.entries(rates)) {
    if (key === wanted || slugifyHardwareKey(entry.label) === wanted) return entry.rate;
  }

  return 0;
}
