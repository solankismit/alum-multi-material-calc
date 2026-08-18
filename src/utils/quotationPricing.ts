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

/**
 * A quotation becomes uneditable the moment it's printed, or the moment its
 * status moves past DRAFT (e.g. "Mark as Sent") — whichever happens first.
 * Until either happens, it stays editable in place. The only way back into
 * an already-locked quotation is Duplicate (creates a fresh unlocked Draft).
 */
export function isQuotationLocked(quotation: { printedAt: Date | string | null; status: string }): boolean {
  return quotation.printedAt !== null || quotation.status !== "DRAFT";
}

/** Splits a single computed tax amount into CGST/SGST (intra-state) or IGST (inter-state) for display — the underlying rate/amount is unchanged, only how it's broken out. */
export function splitTax(taxAmount: number, taxType: TaxType | undefined): { cgst: number; sgst: number; igst: number } {
  if (taxType === "IGST") {
    return { cgst: 0, sgst: 0, igst: taxAmount };
  }
  return { cgst: taxAmount / 2, sgst: taxAmount / 2, igst: 0 };
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
