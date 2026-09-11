/**
 * Profile (aluminium) pricing — by weight or by length.
 *
 * Aluminium is bought by weight, so ₹/kg is the default basis. The quantity
 * this is applied to is **bars purchased**, not the exact footage of the cut
 * pieces: `stockBreakdown.stocksNeeded × stockLength` already accounts for
 * whole 16ft bars including offcut scrap, which is what actually gets paid for.
 * ₹/ft remains available as an alternative basis.
 *
 * Categories in the "material group" (frame + shutter + interlock by default)
 * are one commodity at one ₹/kg, and collapse into a single combined line
 * carrying per-member weights as `components`.
 */

import type { MaterialCategory } from "../types";
import { MATERIAL_CATEGORY_LABELS } from "./materialCategory";
import { LINE_KEYS, type LineItem, type LineItemComponent } from "./quotationPricing";

export type ProfileRateBasis = "weight" | "length";

/** Rates for one aluminium system, as edited per quotation. */
export interface ProfileRateConfig {
  basis: ProfileRateBasis;
  /** category -> ₹/ft. Used when basis is "length". */
  ratesPerFt: Record<string, number>;
  /** category -> kg per running ft. Used when basis is "weight". */
  weightPerFt: Record<string, number>;
  /** category -> ₹/kg, for categories outside the group. */
  ratesPerKg: Record<string, number>;
  groupCategories: string[];
  groupLabel: string;
  groupRatePerKg: number;
}

export interface ProfilePricingResult {
  lines: LineItem[];
  /** Total weight across every category, group or not — the coating basis. */
  totalWeightKg: number;
  /** Categories priced by weight that have no kg/ft set, so priced at ₹0. */
  missingWeightCategories: string[];
}

function labelFor(category: string): string {
  return MATERIAL_CATEGORY_LABELS[category as MaterialCategory] ?? category;
}

/**
 * Turns per-category footage into priced line items.
 *
 * `qtyFtByCategory` is bars-purchased feet per category, as produced by
 * summing `stocksNeeded × stockLength / 304.8` over a section's materials.
 */
export function priceProfiles(
  qtyFtByCategory: Record<string, number>,
  config: ProfileRateConfig
): ProfilePricingResult {
  const entries = Object.entries(qtyFtByCategory).filter(([, ft]) => ft > 0);

  // Length basis: unchanged from the original behaviour — one ₹/ft line per
  // category, no weight involved, no grouping.
  if (config.basis === "length") {
    const lines = entries.map(([category, qtyFt]) => {
      const rate = config.ratesPerFt[category] || 0;
      return {
        name: labelFor(category),
        key: category,
        quantity: qtyFt,
        unit: "ft",
        rate,
        cost: qtyFt * rate,
      };
    });
    // Weight is still reported, since coating is priced on it regardless.
    const totalWeightKg = entries.reduce(
      (sum, [category, qtyFt]) => sum + qtyFt * (config.weightPerFt[category] || 0),
      0
    );
    return { lines, totalWeightKg, missingWeightCategories: [] };
  }

  const groupSet = new Set(config.groupCategories);
  const lines: LineItem[] = [];
  const groupComponents: LineItemComponent[] = [];
  const missingWeightCategories: string[] = [];
  let groupWeightKg = 0;
  let totalWeightKg = 0;

  entries.forEach(([category, qtyFt]) => {
    const kgPerFt = config.weightPerFt[category] || 0;
    if (kgPerFt <= 0) missingWeightCategories.push(category);

    const weightKg = qtyFt * kgPerFt;
    totalWeightKg += weightKg;

    if (groupSet.has(category)) {
      groupWeightKg += weightKg;
      groupComponents.push({
        name: labelFor(category),
        key: category,
        quantity: weightKg,
        unit: "kg",
      });
      return;
    }

    // Outside the group: its own line, its own ₹/kg (falling back to the
    // group rate so a newly-excluded category is never silently free).
    const rate = config.ratesPerKg[category] ?? config.groupRatePerKg;
    lines.push({
      name: labelFor(category),
      key: category,
      quantity: weightKg,
      unit: "kg",
      rate,
      cost: weightKg * rate,
    });
  });

  if (groupComponents.length > 0) {
    // Sorted so the expanded breakdown reads in a stable order rather than
    // whatever order the materials happened to be calculated in.
    groupComponents.sort((a, b) => a.name.localeCompare(b.name));
    lines.unshift({
      name: config.groupLabel,
      key: LINE_KEYS.profileGroup,
      quantity: groupWeightKg,
      unit: "kg",
      rate: config.groupRatePerKg,
      cost: groupWeightKg * config.groupRatePerKg,
      components: groupComponents,
    });
  }

  return { lines, totalWeightKg, missingWeightCategories };
}

/** Coating is charged on the post-wastage weight: 100kg of material becomes
 * 104kg once coated, and the full 104kg is what gets billed. */
export function priceCoating(
  totalWeightKg: number,
  wastagePercent: number,
  ratePerKg: number
): LineItem | null {
  const coatedWeightKg = totalWeightKg * (1 + wastagePercent / 100);
  if (coatedWeightKg <= 0) return null;

  return {
    name: "Coating",
    key: LINE_KEYS.coating,
    quantity: coatedWeightKg,
    unit: "kg",
    rate: ratePerKg,
    cost: coatedWeightKg * ratePerKg,
  };
}
