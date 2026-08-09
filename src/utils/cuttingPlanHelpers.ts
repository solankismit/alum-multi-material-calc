import type { CuttingPlan } from "../types";

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
  const sqFt = areaSqMm / 92903;
  return sqFt.toFixed(2);
}
