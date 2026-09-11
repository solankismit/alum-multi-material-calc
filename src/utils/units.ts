/**
 * Length units for entry and display. Storage is always **mm** — nothing here
 * changes what is persisted, only how a value is typed and shown.
 *
 * "Dora" is a trade sub-unit of the inch: **1 inch = 8 dora**, so one dora is
 * 3.175mm. Deductions in this trade are quoted in inch+dora (e.g. a height
 * deduction of 2" 6 dora), and pieces are cut to the dora.
 */

import { mmToFeet, feetToMm } from "./formatters";

export type LengthUnit = "mm" | "ft" | "inDora" | "dora";

export const MM_PER_INCH = 25.4;
export const DORA_PER_INCH = 8;
export const MM_PER_DORA = MM_PER_INCH / DORA_PER_INCH; // 3.175
export const MM_PER_FOOT = 304.8;

export const UNIT_LABELS: Record<LengthUnit, string> = {
  mm: "mm",
  ft: "ft",
  inDora: "in-dora",
  dora: "dora",
};

/** Units offered for window dimensions. `dora` alone is far too fine a unit
 * for a whole window, so it is not offered here. */
export const DIMENSION_UNITS: LengthUnit[] = ["mm", "ft", "inDora"];

/** Units offered for the small sub-inch deduction constants. Whole feet are
 * meaningless at this scale; plain dora is the natural unit, since the real
 * constants are exact dora multiples (3.175 = 1, 66.675 = 21, 104.775 = 33). */
export const DEDUCTION_UNITS: LengthUnit[] = ["mm", "dora", "inDora"];

/**
 * Parses an inch+dora value to mm. Accepts, deliberately, two spellings of
 * the same measurement:
 *
 *   "47-3"   / "47 3"  -> 47 inch + 3 dora
 *   "47.375"           -> decimal inches (= 47 inch 3 dora)
 *   "47"               -> whole inches
 *
 * A leading minus is a negative number, not a separator: `-5` is −5 inches,
 * while `47-3` is 47″ 3 dora. Deduction constants can legitimately be
 * negative, so this distinction matters. `-5-3` is rejected as ambiguous.
 */
export function parseInchDora(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;

  // inch/dora pair — the separator must follow a digit, so a leading "-"
  // cannot be mistaken for one.
  const pair = text.match(/^(-?\d+(?:\.\d+)?)(?:\s*-\s*|\s+)(\d+(?:\.\d+)?)$/);
  if (pair) {
    const inches = Number(pair[1]);
    const dora = Number(pair[2]);
    if (!Number.isFinite(inches) || !Number.isFinite(dora)) return null;
    // A negative inch part carries its sign into the dora part, so
    // "-2 4" reads as −(2″ 4 dora) rather than −2″ + 4 dora.
    const magnitude = Math.abs(inches) * MM_PER_INCH + dora * MM_PER_DORA;
    return inches < 0 || Object.is(inches, -0) ? -magnitude : magnitude;
  }

  const decimal = Number(text);
  if (!Number.isFinite(decimal)) return null;
  return decimal * MM_PER_INCH;
}

/** Formats mm as inch+dora, e.g. `47-3`. Collapses to whole inches when the
 * dora part rounds to zero, and carries into the inch when it rounds to 8. */
export function formatInchDora(mm: number): string {
  const negative = mm < 0;
  const totalDora = Math.abs(mm) / MM_PER_DORA;

  let inches = Math.floor(totalDora / DORA_PER_INCH);
  let dora = Math.round(totalDora - inches * DORA_PER_INCH);
  if (dora === DORA_PER_INCH) {
    inches += 1;
    dora = 0;
  }

  const text = dora === 0 ? `${inches}` : `${inches}-${dora}`;
  return negative && (inches !== 0 || dora !== 0) ? `-${text}` : text;
}

/** Parses a user-entered value in `unit` to mm. `null` when unparseable. */
export function parseLength(raw: string, unit: LengthUnit): number | null {
  const text = raw.trim();
  if (!text) return null;

  if (unit === "inDora") return parseInchDora(text);

  const value = Number(text);
  if (!Number.isFinite(value)) return null;

  switch (unit) {
    case "mm":
      return value;
    case "ft":
      return feetToMm(value);
    case "dora":
      return value * MM_PER_DORA;
  }
}

/**
 * Formats mm for display in `unit`, without a unit suffix (callers add it).
 *
 * Note that `inDora` and `dora` quantize to 3.175mm, so a value that is not a
 * whole number of dora does not round-trip exactly — 1000mm shows as `39-3`,
 * which is 997.7mm. Entry forms should keep the user's typed string rather
 * than re-deriving it from the stored value on every keystroke.
 */
export function formatLength(mm: number, unit: LengthUnit): string {
  switch (unit) {
    case "mm":
      // Trims trailing zeros so 69.85 doesn't read as "69.850".
      return String(Number(mm.toFixed(3)));
    case "ft":
      return mmToFeet(mm);
    case "inDora":
      return formatInchDora(mm);
    case "dora":
      return String(Number((mm / MM_PER_DORA).toFixed(2)));
  }
}

/** True when this unit's display is lossy for the given mm value, i.e. the
 * formatted text would not parse back to the same measurement. Used to warn
 * rather than to block. */
export function isLossyInUnit(mm: number, unit: LengthUnit): boolean {
  if (unit !== "inDora" && unit !== "dora") return false;
  const roundTripped = parseLength(formatLength(mm, unit), unit);
  return roundTripped === null || Math.abs(roundTripped - mm) > 0.0005;
}
