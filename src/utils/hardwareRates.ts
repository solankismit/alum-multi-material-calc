/** RateCard.hardwareRates is keyed by a STABLE key, not the display label —
 * renaming a hardware item's label never breaks a lookup that was already
 * pointing at its key. Every entry carries its own label so the UI never
 * needs the key to render anything user-facing. */
export interface HardwareRateEntry {
  label: string;
  rate: number;
}

export type HardwareRateMap = Record<string, HardwareRateEntry>;

/** Turns a display label into a stable, URL/JSON-safe key. Collisions are
 * handled by the caller (append a numeric suffix) — this function is pure. */
export function slugifyHardwareKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Finds a hardware entry by its display label (not its key) — this is how
 * every existing caller looks up a rate today, since the user types/selects
 * a label, not a key, when entering a hardware line item. */
export function findHardwareRateByLabel(map: HardwareRateMap | undefined, label: string): number | undefined {
  if (!map) return undefined;
  for (const entry of Object.values(map)) {
    if (entry.label === label) return entry.rate;
  }
  return undefined;
}

/** The stable key/label pair for the one hardware accessory this app treats
 * as a first-class, checkbox-driven line item rather than free text. */
export const PLEATED_MOSQUITO_NET_KEY = "pleated_mosquito_net";
export const PLEATED_MOSQUITO_NET_LABEL = "Pleated Mosquito Net";

/** Conventional labels for the auto-quantified hardware items (lock, bearing,
 * corner, PVC connector, male-female cap) — quantities come from
 * SectionConfiguration.*Count, rates come from a RateCard.hardwareRates entry
 * with this exact label, looked up via findHardwareRateByLabel() the same way
 * "Mosquito Mesh"/"Track Cap" rates are looked up today. */
export const LOCK_LABEL = "Lock";
export const BEARING_LABEL = "Bearing";
export const CORNER_LABEL = "Corner";
export const PVC_CONNECTOR_LABEL = "PVC Connector";
export const MALE_FEMALE_CAP_LABEL = "Male-Female Cap";
