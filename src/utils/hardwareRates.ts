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
