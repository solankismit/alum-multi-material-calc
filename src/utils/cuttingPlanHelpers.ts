import type { CuttingPlan } from "../types";
import { sqMmToSqFt } from "./formatters";

export interface AggregatedPlan {
  stockLength: number;
  stockName: string;
  pieces: number[];
  pieceTypes?: string[];
  wastage: number;
  count: number; // Multiplier (e.g., 4x)
}

/**
 * Groups identical cutting patterns (same pieces, types, and wastage) together
 * with a count multiplier, so a shop-floor cut list shows "4x this pattern"
 * instead of repeating the same bar diagram four times.
 */
export function aggregatePlans(
  plans: CuttingPlan[],
  stockLength: number,
  stockName: string
): AggregatedPlan[] {
  const groups: { [key: string]: AggregatedPlan } = {};

  plans.forEach((plan) => {
    const piecesKey = plan.pieces.join(",");
    const typesKey = plan.pieceTypes ? plan.pieceTypes.join(",") : "";
    const key = `${piecesKey}|${typesKey}|${plan.wastage}`;

    if (!groups[key]) {
      groups[key] = {
        stockLength,
        stockName: plan.stockName || stockName,
        pieces: plan.pieces,
        pieceTypes: plan.pieceTypes,
        wastage: plan.wastage,
        count: 0,
      };
    }
    groups[key].count++;
  });

  return Object.values(groups).sort((a, b) => b.count - a.count);
}

export function getPieceDescription(pieces: number[], types?: string[]) {
  const summary: { [key: string]: number } = {};

  pieces.forEach((len, idx) => {
    const typeRaw = types?.[idx];
    let label = "Piece";
    if (typeRaw) {
      if (typeRaw.includes("width")) label = "Width";
      else if (typeRaw.includes("height")) label = "Height";
      else if (typeRaw.includes("interlock")) label = "Interlock";
      else if (typeRaw.includes("track")) label = "Track";
      else if (typeRaw.includes("mullion")) label = "Mullion";
    }
    const key = `${label} ${len}mm`;
    summary[key] = (summary[key] || 0) + 1;
  });

  return Object.entries(summary)
    .map(([key, count]) => `${count}x ${key}`)
    .join(", ");
}

export function formatArea(areaSqMm: number) {
  return sqMmToSqFt(areaSqMm).toFixed(2);
}

/**
 * Color legend for a cutting-plan bar's piece segments, keyed by piece type
 * substring. Shared by WorksheetReport and CuttingPlanDocument so their bar
 * charts never drift out of sync again (WorksheetReport was previously
 * missing the mullion color CuttingPlanDocument had).
 */
export function getPieceColorClass(type: string): string {
  if (type.includes("width")) return "bg-emerald-200 text-emerald-900 border-emerald-300";
  if (type.includes("interlock")) return "bg-amber-200 text-amber-900 border-amber-300";
  if (type.includes("m-height") || type.includes("m-width")) return "bg-rose-200 text-rose-900 border-rose-300";
  if (type.includes("track")) return "bg-cyan-200 text-cyan-900 border-cyan-300";
  if (type.includes("mullion")) return "bg-purple-200 text-purple-900 border-purple-300";
  return "bg-indigo-200 text-indigo-900 border-indigo-300"; // default: height
}
