import type { MaterialRequirement, StockBreakdown } from "../types";
import { resolveMaterialCategory } from "./materialCategory";

export interface MaterialSummary {
  totalMaterial: number;
  totalStockUsed: number;
  totalWastage: number;
  wastagePercent: number;
  totalGlassArea: number;
  totalMosquitoArea?: number;
  stockSummary: { [key: string]: number };
  wastagePiecesSummary: { [key: string]: number };
  frameStockSummary: { [key: string]: number };
  shutterStockSummary: { [key: string]: number };
  interlockStockSummary: { [key: string]: number };
  trackRailStockSummary: { [key: string]: number };
  mullionStockSummary: { [key: string]: number };
  frameWastagePiecesSummary: { [key: string]: number };
  shutterWastagePiecesSummary: { [key: string]: number };
  interlockWastagePiecesSummary: { [key: string]: number };
  trackRailWastagePiecesSummary: { [key: string]: number };
  mullionWastagePiecesSummary: { [key: string]: number };
}

/**
 * Derives the total stock length consumed by a breakdown.
 *
 * Uses cutting plans when available so that custom stock sizes (not in
 * STOCK_OPTIONS) are handled correctly — each plan already encodes the exact
 * bar length via  pieces + wastage.  Falls back to stocksNeeded × stockLength
 * for breakdowns that were built without cutting plans.
 */
function calculateTotalStockUsed(breakdown: StockBreakdown): number {
  if (breakdown.cuttingPlans && breakdown.cuttingPlans.length > 0) {
    return breakdown.cuttingPlans.reduce((sum, plan) => {
      const piecesTotal = plan.pieces.reduce((s, p) => s + p, 0);
      return sum + piecesTotal + plan.wastage;
    }, 0); 
  }
  // Fallback for breakdowns without cutting plans
  return breakdown.stocksNeeded * breakdown.stockLength;
}

// ─── Component classification ─────────────────────────────────────────────────

type ComponentCategory =
  | "frame"
  | "shutter"
  | "interlock"
  | "trackRail"
  | "mullion"
  | "other";

function classifyComponent(mat: MaterialRequirement): ComponentCategory {
  return resolveMaterialCategory(mat);
}

// ─── Stock summary ────────────────────────────────────────────────────────────

/**
 * Builds per-stock-size counts broken down by component category.
 * Track Rail and Mullion are now correctly placed in their own buckets
 * instead of silently falling through to the totals-only stockSummary.
 */
function calculateStockSummary(materials: MaterialRequirement[]): {
  stockSummary: { [key: string]: number };
  frameStockSummary: { [key: string]: number };
  shutterStockSummary: { [key: string]: number };
  interlockStockSummary: { [key: string]: number };
  trackRailStockSummary: { [key: string]: number };
  mullionStockSummary: { [key: string]: number };
} {
  const stockSummary: { [key: string]: number } = {};
  const frameStockSummary: { [key: string]: number } = {};
  const shutterStockSummary: { [key: string]: number } = {};
  const interlockStockSummary: { [key: string]: number } = {};
  const trackRailStockSummary: { [key: string]: number } = {};
  const mullionStockSummary: { [key: string]: number } = {};

  const categoryMap: Record<
    ComponentCategory,
    { [key: string]: number } | null
  > = {
    frame: frameStockSummary,
    shutter: shutterStockSummary,
    interlock: interlockStockSummary,
    trackRail: trackRailStockSummary,
    mullion: mullionStockSummary,
    other: null,
  };

  materials.forEach((m) => {
    const category = classifyComponent(m);
    const categoryDict = categoryMap[category];

    if (m.stockBreakdown.allStockCounts) {
      Object.entries(m.stockBreakdown.allStockCounts).forEach(
        ([stockName, count]) => {
          stockSummary[stockName] = (stockSummary[stockName] || 0) + count;
          if (categoryDict) {
            categoryDict[stockName] = (categoryDict[stockName] || 0) + count;
          }
        }
      );
    } else {
      const key = m.stockBreakdown.stockName;
      const stockCount = m.stockBreakdown.stocksNeeded;
      stockSummary[key] = (stockSummary[key] || 0) + stockCount;
      if (categoryDict) {
        categoryDict[key] = (categoryDict[key] || 0) + stockCount;
      }
    }
  });

  return {
    stockSummary,
    frameStockSummary,
    shutterStockSummary,
    interlockStockSummary,
    trackRailStockSummary,
    mullionStockSummary,
  };
}

// ─── Wastage pieces summary ───────────────────────────────────────────────────

/**
 * Counts bars that have any leftover (wastage > 0), grouped by stock name and
 * component category.  Track Rail and Mullion are now tracked in their own
 * buckets.
 */
function calculateWastagePiecesSummary(materials: MaterialRequirement[]): {
  wastagePiecesSummary: { [key: string]: number };
  frameWastagePiecesSummary: { [key: string]: number };
  shutterWastagePiecesSummary: { [key: string]: number };
  interlockWastagePiecesSummary: { [key: string]: number };
  trackRailWastagePiecesSummary: { [key: string]: number };
  mullionWastagePiecesSummary: { [key: string]: number };
} {
  const wastagePiecesSummary: { [key: string]: number } = {};
  const frameWastagePiecesSummary: { [key: string]: number } = {};
  const shutterWastagePiecesSummary: { [key: string]: number } = {};
  const interlockWastagePiecesSummary: { [key: string]: number } = {};
  const trackRailWastagePiecesSummary: { [key: string]: number } = {};
  const mullionWastagePiecesSummary: { [key: string]: number } = {};

  const categoryMap: Record<
    ComponentCategory,
    { [key: string]: number } | null
  > = {
    frame: frameWastagePiecesSummary,
    shutter: shutterWastagePiecesSummary,
    interlock: interlockWastagePiecesSummary,
    trackRail: trackRailWastagePiecesSummary,
    mullion: mullionWastagePiecesSummary,
    other: null,
  };

  materials.forEach((m) => {
    if (!m.stockBreakdown.cuttingPlans) return;
    const category = classifyComponent(m);
    const categoryDict = categoryMap[category];

    const wastageByStock: { [stockName: string]: number } = {};
    m.stockBreakdown.cuttingPlans.forEach((plan) => {
      const stockName = plan.stockName || m.stockBreakdown.stockName;
      if (plan.wastage > 0) {
        wastageByStock[stockName] = (wastageByStock[stockName] || 0) + 1;
      }
    });

    Object.entries(wastageByStock).forEach(([stockName, count]) => {
      if (count > 0) {
        wastagePiecesSummary[stockName] =
          (wastagePiecesSummary[stockName] || 0) + count;
        if (categoryDict) {
          categoryDict[stockName] = (categoryDict[stockName] || 0) + count;
        }
      }
    });
  });

  return {
    wastagePiecesSummary,
    frameWastagePiecesSummary,
    shutterWastagePiecesSummary,
    interlockWastagePiecesSummary,
    trackRailWastagePiecesSummary,
    mullionWastagePiecesSummary,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculates summary statistics for a section's materials.
 */
export function calculateSectionSummary(
  materials: MaterialRequirement[]
): MaterialSummary {
  const totalMaterial = materials.reduce((sum, m) => sum + m.totalRequired, 0);
  const totalStockUsed = materials.reduce(
    (sum, m) => sum + calculateTotalStockUsed(m.stockBreakdown),
    0
  );
  const totalWastage = materials.reduce(
    (sum, m) => sum + m.stockBreakdown.totalWastage,
    0
  );

  const {
    stockSummary,
    frameStockSummary,
    shutterStockSummary,
    interlockStockSummary,
    trackRailStockSummary,
    mullionStockSummary,
  } = calculateStockSummary(materials);

  const {
    wastagePiecesSummary,
    frameWastagePiecesSummary,
    shutterWastagePiecesSummary,
    interlockWastagePiecesSummary,
    trackRailWastagePiecesSummary,
    mullionWastagePiecesSummary,
  } = calculateWastagePiecesSummary(materials);

  return {
    totalMaterial,
    totalStockUsed,
    totalWastage,
    wastagePercent: totalStockUsed > 0 ? (totalWastage / totalStockUsed) * 100 : 0,
    totalGlassArea: 0, // Populated by calculateMaterials() after glass area pass
    totalMosquitoArea: 0,
    stockSummary,
    wastagePiecesSummary,
    frameStockSummary,
    shutterStockSummary,
    interlockStockSummary,
    trackRailStockSummary,
    mullionStockSummary,
    frameWastagePiecesSummary,
    shutterWastagePiecesSummary,
    interlockWastagePiecesSummary,
    trackRailWastagePiecesSummary,
    mullionWastagePiecesSummary,
  };
}

/**
 * Merges multiple section summaries into one combined summary.
 */
export function combineSummaries(
  summaries: MaterialSummary[]
): MaterialSummary {
  const combined: MaterialSummary = {
    totalMaterial: 0,
    totalStockUsed: 0,
    totalWastage: 0,
    wastagePercent: 0,
    totalGlassArea: 0,
    totalMosquitoArea: 0,
    stockSummary: {},
    wastagePiecesSummary: {},
    frameStockSummary: {},
    shutterStockSummary: {},
    interlockStockSummary: {},
    trackRailStockSummary: {},
    mullionStockSummary: {},
    frameWastagePiecesSummary: {},
    shutterWastagePiecesSummary: {},
    interlockWastagePiecesSummary: {},
    trackRailWastagePiecesSummary: {},
    mullionWastagePiecesSummary: {},
  };

  const mergeDict = (
    target: { [key: string]: number },
    source: { [key: string]: number } | undefined
  ) => {
    if (!source) return;
    Object.entries(source).forEach(([key, count]) => {
      target[key] = (target[key] || 0) + count;
    });
  };

  summaries.forEach((summary) => {
    combined.totalMaterial += summary.totalMaterial;
    combined.totalStockUsed += summary.totalStockUsed;
    combined.totalWastage += summary.totalWastage;
    combined.totalGlassArea += summary.totalGlassArea;
    combined.totalMosquitoArea =
      (combined.totalMosquitoArea || 0) + (summary.totalMosquitoArea || 0);

    mergeDict(combined.stockSummary, summary.stockSummary);
    mergeDict(combined.frameStockSummary, summary.frameStockSummary);
    mergeDict(combined.shutterStockSummary, summary.shutterStockSummary);
    mergeDict(combined.interlockStockSummary, summary.interlockStockSummary);
    mergeDict(combined.trackRailStockSummary, summary.trackRailStockSummary);
    mergeDict(combined.mullionStockSummary, summary.mullionStockSummary);
    mergeDict(combined.wastagePiecesSummary, summary.wastagePiecesSummary);
    mergeDict(combined.frameWastagePiecesSummary, summary.frameWastagePiecesSummary);
    mergeDict(combined.shutterWastagePiecesSummary, summary.shutterWastagePiecesSummary);
    mergeDict(combined.interlockWastagePiecesSummary, summary.interlockWastagePiecesSummary);
    mergeDict(combined.trackRailWastagePiecesSummary, summary.trackRailWastagePiecesSummary);
    mergeDict(combined.mullionWastagePiecesSummary, summary.mullionWastagePiecesSummary);
  });

  combined.wastagePercent =
    combined.totalStockUsed > 0
      ? (combined.totalWastage / combined.totalStockUsed) * 100
      : 0;

  return combined;
}
