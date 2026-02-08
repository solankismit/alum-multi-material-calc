import type { StockOption, StockBreakdown, CuttingPlan } from "../types";

export const STOCK_OPTIONS: StockOption[] = [
  { length: 4877, name: "16ft", lengthFeet: 16 },
  { length: 4572, name: "15ft", lengthFeet: 15 },
  { length: 3658, name: "12ft", lengthFeet: 12 },
];

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
 * Optimizes stock usage for a single piece type
 */
export function optimizeStockUsage(
  requiredLength: number,
  totalPieces: number,
  stockOptions: StockOption[] = STOCK_OPTIONS
): StockBreakdown {
  let bestOption: StockBreakdown | null = null;
  let minWastagePercent = Infinity;
  let bestCuttingPlans: CuttingPlan[] = [];

  for (const stock of stockOptions) {
    const piecesPerStock = Math.floor(stock.length / requiredLength);
    if (piecesPerStock === 0) continue;

    const stocksNeeded = Math.ceil(totalPieces / piecesPerStock);
    const totalLength = stocksNeeded * stock.length;
    const usedLength = totalPieces * requiredLength;
    const wastage = totalLength - usedLength;
    const wastagePercent = (wastage / totalLength) * 100;

    // Generate cutting plans
    const cuttingPlans: CuttingPlan[] = [];
    let remainingPieces = totalPieces;

    for (let i = 0; i < stocksNeeded; i++) {
      const piecesFromThisStock = Math.min(piecesPerStock, remainingPieces);
      const pieces: number[] = [];
      for (let j = 0; j < piecesFromThisStock; j++) {
        pieces.push(requiredLength);
      }
      const stockWastage = stock.length - piecesFromThisStock * requiredLength;
      cuttingPlans.push({
        stockIndex: i + 1,
        pieces,
        wastage: stockWastage,
      });
      remainingPieces -= piecesFromThisStock;
    }

    if (wastagePercent < minWastagePercent) {
      minWastagePercent = wastagePercent;
      bestCuttingPlans = cuttingPlans;
      bestOption = {
        stockLength: stock.length,
        stockName: stock.name,
        stocksNeeded,
        piecesPerStock,
        totalWastage: wastage,
        wastagePercent,
        cuttingPlans: bestCuttingPlans,
        requiredLength,
        totalPieces,
      };
    }
  }

  if (!bestOption && stockOptions.length > 0) {
    const largestStock = stockOptions[0];
    const cuttingPlans: CuttingPlan[] = [];
    for (let i = 0; i < totalPieces; i++) {
      cuttingPlans.push({
        stockIndex: i + 1,
        pieces: [requiredLength],
        wastage: largestStock.length - requiredLength,
      });
    }
    bestOption = {
      stockLength: largestStock.length,
      stockName: largestStock.name,
      stocksNeeded: totalPieces,
      piecesPerStock: 1,
      totalWastage: totalPieces * (largestStock.length - requiredLength),
      wastagePercent:
        ((totalPieces * (largestStock.length - requiredLength)) /
          (totalPieces * largestStock.length)) *
        100,
      cuttingPlans,
      requiredLength,
      totalPieces,
    };
  }

  // Fallback if still null (e.g. empty stockOptions passed)
  if (!bestOption) {
    throw new Error("No valid stock options provided");
  }

  return bestOption;
}

/**
 * Packs pieces into a single stock using greedy algorithm
 */
export function packStock(
  stock: StockOption,
  remainingPieces: PieceRequirement[]
): {
  pieces: { length: number; type: string }[];
  wastage: number;
  remaining: number;
} {
  const pieces: { length: number; type: string }[] = [];
  let usedLength = 0;
  const tempRemaining = remainingPieces.map((p) => ({ ...p }));

  // Sort pieces by length (largest first) for better packing
  const sortedPieces = [...tempRemaining].sort((a, b) => b.length - a.length);

  for (const req of sortedPieces) {
    while (req.count > 0 && usedLength + req.length <= stock.length) {
      pieces.push({ length: req.length, type: req.type });
      usedLength += req.length;
      req.count--;
    }
  }

  const wastage = stock.length - usedLength;
  const remaining = tempRemaining.reduce((sum, p) => sum + p.count, 0);

  return { pieces, wastage, remaining };
}

/**
 * Optimizes stock usage for multiple piece types using bin packing
 */
export function optimizeCombinedStockUsage(
  pieceRequirements: PieceRequirement[],
  stockOptions: StockOption[] = STOCK_OPTIONS
): CombinedStockBreakdown {
  let bestSolution: {
    stockCounts: { [stockName: string]: number };
    cuttingPlans: CuttingPlan[];
    totalWastage: number;
    totalStockLength: number;
    pieceBreakdown: { [type: string]: number };
  } | null = null;
  let minWastagePercent = Infinity;

  // Use passed stockOptions
  const currentStockOptions = stockOptions.length > 0 ? stockOptions : STOCK_OPTIONS;

  // Pack pieces into stocks using greedy algorithm
  const stockCounts: { [stockName: string]: number } = {};
  const cuttingPlans: CuttingPlan[] = [];
  const pieceBreakdown: { [type: string]: number } = {};

  // Initialize piece counts
  const remainingPieces: PieceRequirement[] = pieceRequirements.map((p) => ({
    ...p,
    count: p.count,
  }));

  let stockIndex = 1;
  let totalStockLength = 0;
  let totalWastage = 0;

  // Pack pieces into stocks
  while (remainingPieces.some((p) => p.count > 0)) {
    // Try each stock size and pick the best one
    let bestStock: StockOption | null = null;
    let bestPieces: { length: number; type: string }[] = [];
    let bestWastage = Infinity;

    // Try each stock size
    for (const stock of currentStockOptions) {
      const packed = packStock(stock, remainingPieces);
      if (packed.pieces.length > 0 && packed.wastage < bestWastage) {
        bestStock = stock;
        bestPieces = packed.pieces;
        bestWastage = packed.wastage;
      }
    }

    if (!bestStock || bestPieces.length === 0) break;

    // Use the best stock
    const stockName = bestStock.name;
    stockCounts[stockName] = (stockCounts[stockName] || 0) + 1;
    totalStockLength += bestStock.length;
    totalWastage += bestWastage;

    // Update remaining pieces
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
      stockName: stockName,
      pieces: bestPieces.map((p) => p.length),
      pieceTypes,
      wastage: bestWastage,
    });

    // Remove exhausted piece types
    remainingPieces.forEach((req) => {
      if (req.count <= 0) {
        const index = remainingPieces.indexOf(req);
        if (index > -1) remainingPieces.splice(index, 1);
      }
    });
  }

  // Check if all pieces are packed
  const allPacked =
    remainingPieces.length === 0 || remainingPieces.every((p) => p.count === 0);
  if (allPacked) {
    const wastagePercent = (totalWastage / totalStockLength) * 100;
    if (wastagePercent < minWastagePercent) {
      minWastagePercent = wastagePercent;
      bestSolution = {
        stockCounts,
        cuttingPlans,
        totalWastage,
        totalStockLength,
        pieceBreakdown,
      };
    }
  }

  // If no solution found, use fallback
  if (!bestSolution) {
    const largestStock = currentStockOptions[0];
    const cuttingPlans: CuttingPlan[] = [];
    let stockIndex = 1;
    let totalStockLength = 0;
    let totalWastage = 0;
    const stockCounts: { [stockName: string]: number } = {};
    const pieceBreakdown: { [type: string]: number } = {};

    pieceRequirements.forEach((req) => {
      for (let i = 0; i < req.count; i++) {
        stockCounts[largestStock.name] =
          (stockCounts[largestStock.name] || 0) + 1;
        totalStockLength += largestStock.length;
        totalWastage += largestStock.length - req.length;
        pieceBreakdown[req.type] = (pieceBreakdown[req.type] || 0) + 1;
        cuttingPlans.push({
          stockIndex: stockIndex++,
          pieces: [req.length],
          pieceTypes: [req.type],
          wastage: largestStock.length - req.length,
        });
      }
    });

    bestSolution = {
      stockCounts,
      cuttingPlans,
      totalWastage,
      totalStockLength,
      pieceBreakdown,
    };
  }

  // Calculate total pieces
  const totalPieces = pieceRequirements.reduce((sum, p) => sum + p.count, 0);
  const totalStocks = Object.values(bestSolution.stockCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const avgPiecesPerStock = totalPieces / totalStocks;

  // Determine primary stock (most used)
  const primaryStockName =
    Object.entries(bestSolution.stockCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || currentStockOptions[0].name;
  const primaryStock =
    currentStockOptions.find((s) => s.name === primaryStockName) || currentStockOptions[0];

  return {
    stockLength: primaryStock.length,
    stockName: primaryStockName,
    stocksNeeded: totalStocks,
    piecesPerStock: Math.round(avgPiecesPerStock * 100) / 100,
    totalWastage: bestSolution.totalWastage,
    wastagePercent:
      (bestSolution.totalWastage / bestSolution.totalStockLength) * 100,
    cuttingPlans: bestSolution.cuttingPlans,
    pieceBreakdown: bestSolution.pieceBreakdown,
    allStockCounts: bestSolution.stockCounts,
    totalPieces,
  };
}
