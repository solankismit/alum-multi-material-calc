import type { StockOption, StockBreakdown, CuttingPlan } from "../types";

export const STOCK_OPTIONS: StockOption[] = [
  { length: 4877, name: "16ft", lengthFeet: 16 },
  { length: 4572, name: "15ft", lengthFeet: 15 },
  { length: 3658, name: "12ft", lengthFeet: 12 },
];

/**
 * Kerf width in mm — material consumed by each aluminium saw cut.
 * Each cut between pieces wastes this amount of stock.
 * Standard aluminium profile saws waste ~2–3 mm per cut.
 * Used as the fallback whenever a caller doesn't pass an explicit kerf.
 */
export const DEFAULT_KERF_WIDTH_MM = 0;

/** Picks the option with the largest length — used by both fallbacks below,
 * which need the true longest bar, not just stockOptions[0] (only correct
 * when the caller happens to pass options pre-sorted descending). */
function findLongestStock(stockOptions: StockOption[]): StockOption {
  return stockOptions.reduce((longest, s) => (s.length > longest.length ? s : longest), stockOptions[0]);
}

export interface PieceRequirement {
  length: number;
  count: number;
  type: string;
}

export interface CombinedStockBreakdown extends StockBreakdown {
  pieceBreakdown?: {
    [type: string]: number;
  };
  allStockCounts?: {
    [stockName: string]: number;
  };
}

/**
 * Optimizes stock usage for a single piece type.
 * Tries all stock sizes and picks the one with the lowest wastage %.
 * Accounts for kerf (saw blade width) between every cut.
 */
export function optimizeStockUsage(
  requiredLength: number,
  totalPieces: number,
  stockOptions: StockOption[] = STOCK_OPTIONS,
  kerfWidthMm: number = DEFAULT_KERF_WIDTH_MM
): StockBreakdown {
  let bestOption: StockBreakdown | null = null;
  let minWastagePercent = Infinity;

  for (const stock of stockOptions) {
    // With kerf: N pieces fit when N*(L + K) - K ≤ S  →  N ≤ (S + K) / (L + K)
    const piecesPerStock = Math.floor(
      (stock.length + kerfWidthMm) / (requiredLength + kerfWidthMm)
    );
    if (piecesPerStock === 0) continue;

    const stocksNeeded = Math.ceil(totalPieces / piecesPerStock);

    // Generate cutting plans with kerf-aware wastage per bar
    const cuttingPlans: CuttingPlan[] = [];
    let remainingPieces = totalPieces;
    let totalWastage = 0;

    for (let i = 0; i < stocksNeeded; i++) {
      const piecesFromThisStock = Math.min(piecesPerStock, remainingPieces);
      const pieces: number[] = Array(piecesFromThisStock).fill(requiredLength);
      // Kerf applies between pieces (N pieces = N-1 cuts)
      const kerfInThisStock =
        piecesFromThisStock > 1 ? (piecesFromThisStock - 1) * kerfWidthMm : 0;
      const stockWastage =
        stock.length - piecesFromThisStock * requiredLength - kerfInThisStock;
      cuttingPlans.push({ stockIndex: i + 1, pieces, wastage: stockWastage });
      totalWastage += stockWastage;
      remainingPieces -= piecesFromThisStock;
    }

    const totalLength = stocksNeeded * stock.length;
    const wastagePercent = (totalWastage / totalLength) * 100;

    if (wastagePercent < minWastagePercent) {
      minWastagePercent = wastagePercent;
      bestOption = {
        stockLength: stock.length,
        stockName: stock.name,
        stocksNeeded,
        piecesPerStock,
        totalWastage,
        wastagePercent,
        cuttingPlans,
        requiredLength,
        totalPieces,
      };
    }
  }

  // Fallback: piece is larger than every stock option — one piece per stock bar.
  // The piece still won't fit in a single bar; wastage is clamped to 0 rather
  // than reporting a nonsensical negative number, and the caller is told the
  // piece exceeds every stock length so it can be flagged for splicing/review.
  if (!bestOption && stockOptions.length > 0) {
    const largestStock = findLongestStock(stockOptions);
    const perPieceWastage = Math.max(0, largestStock.length - requiredLength);
    const exceedsStockLength = requiredLength > largestStock.length;
    const cuttingPlans: CuttingPlan[] = [];
    for (let i = 0; i < totalPieces; i++) {
      cuttingPlans.push({
        stockIndex: i + 1,
        pieces: [requiredLength],
        wastage: perPieceWastage,
      });
    }
    const totalWastage = totalPieces * perPieceWastage;
    bestOption = {
      stockLength: largestStock.length,
      stockName: largestStock.name,
      stocksNeeded: totalPieces,
      piecesPerStock: 1,
      totalWastage,
      wastagePercent: (totalWastage / (totalPieces * largestStock.length)) * 100,
      cuttingPlans,
      requiredLength,
      totalPieces,
      ...(exceedsStockLength ? { exceedsStockLength: true, oversizedPieceLength: requiredLength } : {}),
    };
  }

  if (!bestOption) {
    throw new Error("No valid stock options provided");
  }

  return bestOption;
}

/**
 * Packs as many pieces as possible into a single stock bar using a greedy
 * largest-first strategy. Accounts for kerf between consecutive cuts.
 *
 * Returns the pieces packed, absolute wastage, and remaining unplaced count.
 * NOTE: This function does NOT mutate the `remainingPieces` argument.
 */
export function packStock(
  stock: StockOption,
  remainingPieces: PieceRequirement[],
  kerfWidthMm: number = DEFAULT_KERF_WIDTH_MM
): {
  pieces: { length: number; type: string }[];
  wastage: number;
  /** Total count of pieces that could not be placed (for external use). */
  remaining: number;
} {
  const pieces: { length: number; type: string }[] = [];
  let usedLength = 0;
  const tempRemaining = remainingPieces.map((p) => ({ ...p }));

  // Largest pieces first for better fill rate
  const sortedPieces = [...tempRemaining].sort((a, b) => b.length - a.length);

  for (const req of sortedPieces) {
    while (req.count > 0) {
      // First piece has no preceding kerf; every subsequent cut adds kerfWidthMm
      const kerfCost = pieces.length > 0 ? kerfWidthMm : 0;
      if (usedLength + kerfCost + req.length > stock.length) break;
      usedLength += kerfCost + req.length;
      pieces.push({ length: req.length, type: req.type });
      req.count--;
    }
  }

  const wastage = stock.length - usedLength;
  const remaining = tempRemaining.reduce((sum, p) => sum + p.count, 0);

  return { pieces, wastage, remaining };
}

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Runs one greedy bin-packing pass over all pieces using the given stock options.
 * At each step, picks the stock whose wastage PERCENTAGE is lowest (not absolute),
 * which avoids the trap of preferring a smaller bar with lower absolute waste but
 * higher overall waste when aggregated.
 *
 * Returns null if any pieces cannot be placed (piece larger than all stocks).
 */
function runGreedyPack(
  pieceRequirements: PieceRequirement[],
  availableStocks: StockOption[],
  kerfWidthMm: number = DEFAULT_KERF_WIDTH_MM
): {
  stockCounts: { [stockName: string]: number };
  cuttingPlans: CuttingPlan[];
  totalWastage: number;
  totalStockLength: number;
  pieceBreakdown: { [type: string]: number };
} | null {
  const stockCounts: { [stockName: string]: number } = {};
  const cuttingPlans: CuttingPlan[] = [];
  const pieceBreakdown: { [type: string]: number } = {};
  const remainingPieces: PieceRequirement[] = pieceRequirements.map((p) => ({
    ...p,
  }));

  let stockIndex = 1;
  let totalStockLength = 0;
  let totalWastage = 0;

  while (remainingPieces.some((p) => p.count > 0)) {
    let bestStock: StockOption | null = null;
    let bestPieces: { length: number; type: string }[] = [];
    let bestWastage = 0;
    let bestWastagePercent = Infinity;

    for (const stock of availableStocks) {
      const packed = packStock(stock, remainingPieces, kerfWidthMm);
      if (packed.pieces.length > 0) {
        // Compare wastage as a fraction of bar length, not absolute mm
        const wastagePercent = packed.wastage / stock.length;
        if (wastagePercent < bestWastagePercent) {
          bestStock = stock;
          bestPieces = packed.pieces;
          bestWastage = packed.wastage;
          bestWastagePercent = wastagePercent;
        }
      }
    }

    // No stock can fit any remaining piece (all pieces exceed every stock size)
    if (!bestStock || bestPieces.length === 0) return null;

    const stockName = bestStock.name;
    stockCounts[stockName] = (stockCounts[stockName] || 0) + 1;
    totalStockLength += bestStock.length;
    totalWastage += bestWastage;

    const pieceTypes: string[] = [];
    bestPieces.forEach((piece) => {
      const req = remainingPieces.find(
        (r) => r.length === piece.length && r.type === piece.type
      );
      if (req && req.count > 0) {
        req.count--;
        pieceTypes.push(piece.type);
        pieceBreakdown[piece.type] = (pieceBreakdown[piece.type] || 0) + 1;
      }
    });

    cuttingPlans.push({
      stockIndex: stockIndex++,
      stockName,
      pieces: bestPieces.map((p) => p.length),
      pieceTypes,
      wastage: bestWastage,
    });

    // Remove exhausted piece types — iterate backwards to avoid skipping
    // elements when splicing (the old forEach+splice had a mutation bug).
    for (let i = remainingPieces.length - 1; i >= 0; i--) {
      if (remainingPieces[i].count <= 0) {
        remainingPieces.splice(i, 1);
      }
    }
  }

  return { stockCounts, cuttingPlans, totalWastage, totalStockLength, pieceBreakdown };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Optimizes stock usage for multiple piece types using bin packing.
 *
 * Strategy: tries N+1 solutions and keeps the one with lowest waste %:
 *   • One solution per stock size used exclusively  (N solutions)
 *   • One mixed-stock greedy solution               (1 solution)
 *
 * This avoids the previous single-pass issue where minWastagePercent was
 * always Infinity and only one greedy path was ever evaluated.
 */
export function optimizeCombinedStockUsage(
  pieceRequirements: PieceRequirement[],
  stockOptions: StockOption[] = STOCK_OPTIONS,
  kerfWidthMm: number = DEFAULT_KERF_WIDTH_MM
): CombinedStockBreakdown {
  const currentStockOptions =
    stockOptions.length > 0 ? stockOptions : STOCK_OPTIONS;

  let bestSolution: {
    stockCounts: { [stockName: string]: number };
    cuttingPlans: CuttingPlan[];
    totalWastage: number;
    totalStockLength: number;
    pieceBreakdown: { [type: string]: number };
  } | null = null;
  let minWastagePercent = Infinity;

  const tryAndKeepBest = (
    result: ReturnType<typeof runGreedyPack>
  ) => {
    if (!result) return;
    const wastagePercent =
      result.totalStockLength > 0
        ? (result.totalWastage / result.totalStockLength) * 100
        : 0;
    if (wastagePercent < minWastagePercent) {
      minWastagePercent = wastagePercent;
      bestSolution = result;
    }
  };

  // Strategy A: each stock size used exclusively
  for (const stock of currentStockOptions) {
    tryAndKeepBest(runGreedyPack(pieceRequirements, [stock], kerfWidthMm));
  }

  // Strategy B: mixed-stock greedy (best wastage % per iteration)
  tryAndKeepBest(runGreedyPack(pieceRequirements, currentStockOptions, kerfWidthMm));

  // Fallback: piece(s) exceed every available stock — one piece per bar.
  // Wastage per oversized piece is clamped to 0 (never negative), and any
  // piece that exceeds the longest stock is flagged via exceedsStockLength /
  // oversizedPieceLength so the caller can surface a real warning instead of
  // a nonsensical negative wastage percentage.
  let fallbackExceedsStockLength = false;
  let fallbackOversizedPieceLength = 0;
  if (!bestSolution) {
    const largestStock = findLongestStock(currentStockOptions);
    const fallbackCuttingPlans: CuttingPlan[] = [];
    let stockIdx = 1;
    let totalStockLength = 0;
    let totalWastage = 0;
    const stockCounts: { [stockName: string]: number } = {};
    const pieceBreakdown: { [type: string]: number } = {};

    pieceRequirements.forEach((req) => {
      const pieceWastage = Math.max(0, largestStock.length - req.length);
      if (req.length > largestStock.length) {
        fallbackExceedsStockLength = true;
        fallbackOversizedPieceLength = Math.max(fallbackOversizedPieceLength, req.length);
      }
      for (let i = 0; i < req.count; i++) {
        stockCounts[largestStock.name] =
          (stockCounts[largestStock.name] || 0) + 1;
        totalStockLength += largestStock.length;
        totalWastage += pieceWastage;
        pieceBreakdown[req.type] = (pieceBreakdown[req.type] || 0) + 1;
        fallbackCuttingPlans.push({
          stockIndex: stockIdx++,
          pieces: [req.length],
          pieceTypes: [req.type],
          wastage: pieceWastage,
        });
      }
    });

    bestSolution = {
      stockCounts,
      cuttingPlans: fallbackCuttingPlans,
      totalWastage,
      totalStockLength,
      pieceBreakdown,
    };
  }

  const totalPieces = pieceRequirements.reduce((sum, p) => sum + p.count, 0);
  const totalStocks = Object.values(bestSolution.stockCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const avgPiecesPerStock = totalStocks > 0 ? totalPieces / totalStocks : 0;

  const primaryStockName =
    Object.entries(bestSolution.stockCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || currentStockOptions[0].name;
  const primaryStock =
    currentStockOptions.find((s) => s.name === primaryStockName) ||
    currentStockOptions[0];

  return {
    stockLength: primaryStock.length,
    stockName: primaryStockName,
    stocksNeeded: totalStocks,
    piecesPerStock: Math.round(avgPiecesPerStock * 100) / 100,
    totalWastage: bestSolution.totalWastage,
    wastagePercent:
      bestSolution.totalStockLength > 0
        ? (bestSolution.totalWastage / bestSolution.totalStockLength) * 100
        : 0,
    cuttingPlans: bestSolution.cuttingPlans,
    pieceBreakdown: bestSolution.pieceBreakdown,
    allStockCounts: bestSolution.stockCounts,
    totalPieces,
    ...(fallbackExceedsStockLength
      ? { exceedsStockLength: true, oversizedPieceLength: fallbackOversizedPieceLength }
      : {}),
  };
}
