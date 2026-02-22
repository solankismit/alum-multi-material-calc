import type { MaterialRequirement, StockBreakdown } from "../types";
import { STOCK_OPTIONS } from "./stockOptimization";

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
  frameWastagePiecesSummary: { [key: string]: number };
  shutterWastagePiecesSummary: { [key: string]: number };
  interlockWastagePiecesSummary: { [key: string]: number };
}

/**
 * Gets stock length by name
 */
function getStockLength(stockName: string): number {
  const stock = STOCK_OPTIONS.find((s) => s.name === stockName);
  if (stock) return stock.length;
  // Fallback for known stock sizes
  if (stockName === "12ft") return 3657.6;
  if (stockName === "15ft") return 4572;
  if (stockName === "16ft") return 4876.8;
  return 0;
}

/**
 * Calculates total stock used from a stock breakdown
 */
function calculateTotalStockUsed(breakdown: StockBreakdown): number {
  if (breakdown.allStockCounts) {
    return Object.entries(breakdown.allStockCounts).reduce(
      (sum, [stockName, count]) => {
        return sum + count * getStockLength(stockName);
      },
      0
    );
  } else {
    return breakdown.stocksNeeded * breakdown.stockLength;
  }
}

/**
 * Calculates stock summary from materials
 */
function calculateStockSummary(materials: MaterialRequirement[]): {
  stockSummary: { [key: string]: number };
  frameStockSummary: { [key: string]: number };
  shutterStockSummary: { [key: string]: number };
  interlockStockSummary: { [key: string]: number };
} {
  const stockSummary: { [key: string]: number } = {};
  const frameStockSummary: { [key: string]: number } = {};
  const shutterStockSummary: { [key: string]: number } = {};
  const interlockStockSummary: { [key: string]: number } = {};

  materials.forEach((m) => {
    if (m.stockBreakdown.allStockCounts) {
      Object.entries(m.stockBreakdown.allStockCounts).forEach(
        ([stockName, count]) => {
          stockSummary[stockName] = (stockSummary[stockName] || 0) + count;

          if (m.component.includes("Frame")) {
            frameStockSummary[stockName] =
              (frameStockSummary[stockName] || 0) + count;
          } else if (m.component.includes("Shutter")) {
            shutterStockSummary[stockName] =
              (shutterStockSummary[stockName] || 0) + count;
          } else if (m.component.includes("Interlock")) {
            interlockStockSummary[stockName] =
              (interlockStockSummary[stockName] || 0) + count;
          }
        }
      );
    } else {
      const key = m.stockBreakdown.stockName;
      const stockCount = m.stockBreakdown.stocksNeeded;
      stockSummary[key] = (stockSummary[key] || 0) + stockCount;

      if (m.component.includes("Frame")) {
        frameStockSummary[key] = (frameStockSummary[key] || 0) + stockCount;
      } else if (m.component.includes("Shutter")) {
        shutterStockSummary[key] = (shutterStockSummary[key] || 0) + stockCount;
      } else if (m.component.includes("Interlock")) {
        interlockStockSummary[key] =
          (interlockStockSummary[key] || 0) + stockCount;
      }
    }
  });

  return {
    stockSummary,
    frameStockSummary,
    shutterStockSummary,
    interlockStockSummary,
  };
}

/**
 * Calculates wastage pieces summary from materials
 */
function calculateWastagePiecesSummary(materials: MaterialRequirement[]): {
  wastagePiecesSummary: { [key: string]: number };
  frameWastagePiecesSummary: { [key: string]: number };
  shutterWastagePiecesSummary: { [key: string]: number };
  interlockWastagePiecesSummary: { [key: string]: number };
} {
  const wastagePiecesSummary: { [key: string]: number } = {};
  const frameWastagePiecesSummary: { [key: string]: number } = {};
  const shutterWastagePiecesSummary: { [key: string]: number } = {};
  const interlockWastagePiecesSummary: { [key: string]: number } = {};

  materials.forEach((m) => {
    if (m.stockBreakdown.cuttingPlans) {
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

          if (m.component.includes("Frame")) {
            frameWastagePiecesSummary[stockName] =
              (frameWastagePiecesSummary[stockName] || 0) + count;
          } else if (m.component.includes("Shutter")) {
            shutterWastagePiecesSummary[stockName] =
              (shutterWastagePiecesSummary[stockName] || 0) + count;
          } else if (m.component.includes("Interlock")) {
            interlockWastagePiecesSummary[stockName] =
              (interlockWastagePiecesSummary[stockName] || 0) + count;
          }
        }
      });
    }
  });

  return {
    wastagePiecesSummary,
    frameWastagePiecesSummary,
    shutterWastagePiecesSummary,
    interlockWastagePiecesSummary,
  };
}

/**
 * Calculates summary for a section's materials
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
  } = calculateStockSummary(materials);

  const {
    wastagePiecesSummary,
    frameWastagePiecesSummary,
    shutterWastagePiecesSummary,
    interlockWastagePiecesSummary,
  } = calculateWastagePiecesSummary(materials);

  return {
    totalMaterial,
    totalStockUsed,
    totalWastage,
    wastagePercent: (totalWastage / totalStockUsed) * 100 || 0,
    totalGlassArea: 0, // Will be calculated separately from glassInfo
    totalMosquitoArea: 0,
    stockSummary,
    wastagePiecesSummary,
    frameStockSummary,
    shutterStockSummary,
    interlockStockSummary,
    frameWastagePiecesSummary,
    shutterWastagePiecesSummary,
    interlockWastagePiecesSummary,
  };
}

/**
 * Combines multiple summaries into one
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
    frameWastagePiecesSummary: {},
    shutterWastagePiecesSummary: {},
    interlockWastagePiecesSummary: {},
  };

  summaries.forEach((summary) => {
    combined.totalMaterial += summary.totalMaterial;
    combined.totalStockUsed += summary.totalStockUsed;
    combined.totalWastage += summary.totalWastage;
    combined.totalGlassArea += summary.totalGlassArea;
    combined.totalMosquitoArea = (combined.totalMosquitoArea || 0) + (summary.totalMosquitoArea || 0);

    Object.entries(summary.stockSummary).forEach(([key, count]) => {
      combined.stockSummary[key] = (combined.stockSummary[key] || 0) + count;
    });

    Object.entries(summary.frameStockSummary).forEach(([key, count]) => {
      combined.frameStockSummary[key] =
        (combined.frameStockSummary[key] || 0) + count;
    });

    Object.entries(summary.shutterStockSummary).forEach(([key, count]) => {
      combined.shutterStockSummary[key] =
        (combined.shutterStockSummary[key] || 0) + count;
    });

    Object.entries(summary.interlockStockSummary).forEach(([key, count]) => {
      combined.interlockStockSummary[key] =
        (combined.interlockStockSummary[key] || 0) + count;
    });

    Object.entries(summary.wastagePiecesSummary).forEach(([key, count]) => {
      combined.wastagePiecesSummary[key] =
        (combined.wastagePiecesSummary[key] || 0) + count;
    });

    Object.entries(summary.frameWastagePiecesSummary).forEach(
      ([key, count]) => {
        combined.frameWastagePiecesSummary[key] =
          (combined.frameWastagePiecesSummary[key] || 0) + count;
      }
    );

    Object.entries(summary.shutterWastagePiecesSummary).forEach(
      ([key, count]) => {
        combined.shutterWastagePiecesSummary[key] =
          (combined.shutterWastagePiecesSummary[key] || 0) + count;
      }
    );

    Object.entries(summary.interlockWastagePiecesSummary).forEach(
      ([key, count]) => {
        combined.interlockWastagePiecesSummary[key] =
          (combined.interlockWastagePiecesSummary[key] || 0) + count;
      }
    );
  });

  combined.wastagePercent =
    (combined.totalWastage / combined.totalStockUsed) * 100 || 0;

  return combined;
}
