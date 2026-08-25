import { z } from "zod";
import type { LaborMode } from "./laborCost";

export type DiscountType = "percent" | "flat";
export type TaxType = "CGST_SGST" | "IGST";

export const DEFAULT_TAX_TYPE: TaxType = "CGST_SGST";

export interface LineItem {
  name: string;
  quantity?: number;
  area?: number;
  unit: string;
  rate: number;
  cost: number;
  widthMm?: number;
  heightMm?: number;
}

/** Where this item goes on site — e.g. "W01 GF Living Room". Purely descriptive, never priced. */
export interface ItemPosition {
  label?: string;
  room?: string;
  floor?: string;
}

/** Per-item hardware/finish spec — the Telesia-style detail block. Every field is optional and
 * free text; an item with none of these set renders exactly as it did before this feature existed. */
export interface ItemSpecDetails {
  profileBrand?: string;
  series?: string;
  glassSpec?: string;
  profileColor?: string;
  meshGrade?: string;
  meshHandle?: string;
  locking?: string;
  handleColor?: string;
  hinge?: string;
  notes?: string;
}

const ITEM_SPEC_DETAIL_KEYS: (keyof ItemSpecDetails)[] = [
  "profileBrand",
  "series",
  "glassSpec",
  "profileColor",
  "meshGrade",
  "meshHandle",
  "locking",
  "handleColor",
  "hinge",
  "notes",
];

/** Merges a section-level default spec with a per-item override — override wins field-by-field,
 * a blank/unset override field falls back to the default. Returns undefined when nothing is set,
 * so old quotations (no defaults, no overrides) render identically to before this feature existed. */
export function mergeItemDetails(defaults?: ItemSpecDetails, overrides?: ItemSpecDetails): ItemSpecDetails | undefined {
  const merged: ItemSpecDetails = {};
  ITEM_SPEC_DETAIL_KEYS.forEach((key) => {
    const value = overrides?.[key]?.trim() || defaults?.[key]?.trim();
    if (value) merged[key] = value;
  });
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export interface SectionPricing {
  sectionId: string;
  sectionName: string;
  sectionTypeName?: string;
  /** Human-readable window configuration, e.g. "27mm Domal — 3-Track — Glass + Mosquito — 3 Shutters". */
  configLabel?: string;
  trackType: string;
  configuration: string;
  panels: number;
  qty: number;
  areaSqFt: number;
  widthMm: number;
  heightMm: number;
  profiles: LineItem[];
  glass: LineItem[];
  accessories: LineItem[];
  subtotal: number;
  /** Cutting/stock wastage % for this section's profiles (internal-view only). */
  materialWastagePercent?: number;
  /** Where this item is installed — shown on the printed quote next to the schematic. */
  position?: ItemPosition;
  /** Resolved (default + override already merged) hardware/finish spec for this item. */
  details?: ItemSpecDetails;
}

export interface LaborItem {
  name: string;
  amount: number;
}

export type LaborBreakdown =
  | { mode: LaborMode; percent: number; ratePerSqft: number }
  | { mode: "itemized"; items: LaborItem[] };

export interface CostInclusion {
  included: boolean;
  amount: number;
  note?: string;
}

export interface DiscountInfo {
  type: DiscountType;
  value: number;
  amount: number;
}

export interface PricingData {
  sections?: SectionPricing[];
  profiles: LineItem[];
  glass: LineItem[];
  accessories: LineItem[];
  labor?: number;
  laborBreakdown?: LaborBreakdown;
  overhead?: number;
  installation?: CostInclusion;
  transportation?: CostInclusion;
  discount?: DiscountInfo;
  profitMargin?: number;
  taxRate?: number;
  taxType?: TaxType;
  termsText?: string;
}

export function sumLaborItems(items: LaborItem[]): number {
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

// --- Runtime validation -----------------------------------------------------
// pricingData is persisted as an untyped JSON column; this schema is the only
// thing standing between a malformed client payload and the database. Every
// field mirrors the TS interfaces above field-for-field — keep them in sync.

const itemPositionSchema = z.object({
  label: z.string().optional(),
  room: z.string().optional(),
  floor: z.string().optional(),
});

const itemSpecDetailsSchema = z.object({
  profileBrand: z.string().optional(),
  series: z.string().optional(),
  glassSpec: z.string().optional(),
  profileColor: z.string().optional(),
  meshGrade: z.string().optional(),
  meshHandle: z.string().optional(),
  locking: z.string().optional(),
  handleColor: z.string().optional(),
  hinge: z.string().optional(),
  notes: z.string().optional(),
});

const lineItemSchema = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  area: z.number().optional(),
  unit: z.string(),
  rate: z.number(),
  cost: z.number(),
  widthMm: z.number().optional(),
  heightMm: z.number().optional(),
});

const sectionPricingSchema = z.object({
  sectionId: z.string(),
  sectionName: z.string(),
  sectionTypeName: z.string().optional(),
  configLabel: z.string().optional(),
  trackType: z.string(),
  configuration: z.string(),
  panels: z.number(),
  qty: z.number(),
  areaSqFt: z.number(),
  widthMm: z.number(),
  heightMm: z.number(),
  profiles: z.array(lineItemSchema),
  glass: z.array(lineItemSchema),
  accessories: z.array(lineItemSchema),
  subtotal: z.number(),
  materialWastagePercent: z.number().optional(),
  position: itemPositionSchema.optional(),
  details: itemSpecDetailsSchema.optional(),
});

const laborItemSchema = z.object({ name: z.string(), amount: z.number() });

const laborBreakdownSchema = z.union([
  z.object({ mode: z.enum(["flat", "percentOfMaterial", "perSqft"]), percent: z.number(), ratePerSqft: z.number() }),
  z.object({ mode: z.literal("itemized"), items: z.array(laborItemSchema) }),
]);

const costInclusionSchema = z.object({
  included: z.boolean(),
  amount: z.number(),
  note: z.string().optional(),
});

const discountInfoSchema = z.object({
  type: z.enum(["percent", "flat"]),
  value: z.number(),
  amount: z.number(),
});

export const pricingDataSchema = z.object({
  sections: z.array(sectionPricingSchema).optional(),
  profiles: z.array(lineItemSchema),
  glass: z.array(lineItemSchema),
  accessories: z.array(lineItemSchema),
  labor: z.number().optional(),
  laborBreakdown: laborBreakdownSchema.optional(),
  overhead: z.number().optional(),
  installation: costInclusionSchema.optional(),
  transportation: costInclusionSchema.optional(),
  discount: discountInfoSchema.optional(),
  profitMargin: z.number().optional(),
  taxRate: z.number().optional(),
  taxType: z.enum(["CGST_SGST", "IGST"]).optional(),
  termsText: z.string().optional(),
});

/**
 * A quotation becomes uneditable the moment it's printed, or the moment its
 * status moves past DRAFT (e.g. "Mark as Sent") — whichever happens first.
 * Until either happens, it stays editable in place. The only way back into
 * an already-locked quotation is Duplicate (creates a fresh unlocked Draft).
 */
export function isQuotationLocked(quotation: { printedAt: Date | string | null; status: string }): boolean {
  return quotation.printedAt !== null || quotation.status !== "DRAFT";
}

/** Splits a single computed tax amount into CGST/SGST (intra-state) or IGST (inter-state) for display — the underlying rate/amount is unchanged, only how it's broken out.
 * Each half is rounded to 2 decimal places, with any 1-paisa rounding remainder added
 * to CGST — on a legal tax invoice, displayed CGST + SGST must sum to exactly the
 * printed tax total, not silently drift by a paisa on odd amounts. */
export function splitTax(taxAmount: number, taxType: TaxType | undefined): { cgst: number; sgst: number; igst: number } {
  if (taxType === "IGST") {
    return { cgst: 0, sgst: 0, igst: Math.round(taxAmount * 100) / 100 };
  }
  const totalPaise = Math.round(taxAmount * 100);
  const sgstPaise = Math.floor(totalPaise / 2);
  const cgstPaise = totalPaise - sgstPaise;
  return { cgst: cgstPaise / 100, sgst: sgstPaise / 100, igst: 0 };
}

export interface TotalsInput {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  installation?: CostInclusion;
  transportation?: CostInclusion;
  discountType: DiscountType;
  discountValue: number;
  profitMarginPercent: number;
  taxRatePercent: number;
}

export interface TotalsResult {
  installationAmount: number;
  transportationAmount: number;
  subTotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  profitAmount: number;
  taxableAmount: number;
  taxAmount: number;
  finalTotal: number;
}

/** The single shared discount -> profit -> tax formula, used by both the builder and the printed view. */
export function computeTotals(input: TotalsInput): TotalsResult {
  const installationAmount = input.installation?.included ? input.installation.amount || 0 : 0;
  const transportationAmount = input.transportation?.included ? input.transportation.amount || 0 : 0;

  const subTotal = input.materialCost + input.laborCost + input.overheadCost + installationAmount + transportationAmount;
  const discountAmount = input.discountType === "percent" ? subTotal * (input.discountValue / 100) : input.discountValue;
  const discountedSubtotal = Math.max(0, subTotal - discountAmount);
  const profitAmount = discountedSubtotal * (input.profitMarginPercent / 100);
  const taxableAmount = discountedSubtotal + profitAmount;
  const taxAmount = taxableAmount * (input.taxRatePercent / 100);

  return {
    installationAmount,
    transportationAmount,
    subTotal,
    discountAmount,
    discountedSubtotal,
    profitAmount,
    taxableAmount,
    taxAmount,
    finalTotal: taxableAmount + taxAmount,
  };
}
