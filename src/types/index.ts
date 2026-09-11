import { SectionType, SectionConfiguration } from "@prisma/client";

export type SectionWithConfigs = SectionType & {
  configurations: SectionConfiguration[];
};

export interface WindowDimension {
  id: string;
  height: number | null;
  width: number | null;
  quantity: number | null;
  sections?: number | null; // For openable windows
}

export interface WindowSection {
  id: string;
  sectionTypeId?: string; // Links back to the SectionType in the DB
  name: string;
  dimensions: WindowDimension[];
  trackType: "2-track" | "3-track" | "openable";
  configuration: "all-glass" | "glass-mosquito" | string;
  hasTrackRail?: boolean;
  mosquitoMeshGrade?: string; // e.g. "304 SS", "Fiber"
  stockMap?: MaterialStockMap;
}

export interface WindowInput {
  sections: WindowSection[];
  /** Saw kerf width in mm used for this calculation — persisted so a saved worksheet stays reproducible. */
  kerfWidthMm?: number;
}

export interface StockOption {
  length: number;
  name: string;
  lengthFeet: number;
}

export type MaterialStockMap = {
  [key: string]: StockOption[];
};

export interface PieceInfo {
  length: number;
  type: string; // e.g., "width", "height", "interlock"
}

export interface CuttingPlan {
  stockIndex: number;
  stockName?: string; // Track which stock size was used
  pieces: number[];
  pieceTypes?: string[]; // Track which type each piece is
  wastage: number;
}

export interface StockBreakdown {
  stockLength: number;
  stockName: string;
  stocksNeeded: number;
  piecesPerStock: number;
  totalWastage: number;
  wastagePercent: number;
  cuttingPlans?: CuttingPlan[];
  requiredLength?: number;
  totalPieces?: number;
  pieceBreakdown?: {
    [type: string]: number;
  };
  allStockCounts?: {
    [stockName: string]: number;
  };
  /** True when at least one required piece is longer than every available
   * stock option — no single bar can hold it, so the fallback placed one
   * piece per bar and the reported wastage is a floor, not a real optimum. */
  exceedsStockLength?: boolean;
  /** The longest required piece length (mm) that didn't fit any stock option. */
  oversizedPieceLength?: number;
}

export type MaterialCategory =
  | "frame"
  | "shutter"
  | "interlock"
  | "trackRail"
  | "mullion";

export interface MaterialRequirement {
  component: string;
  category: MaterialCategory;
  totalRequired: number;
  stockBreakdown: StockBreakdown;
  description?: string;
}

export interface DimensionGlassInfo {
  dimensionId: string;
  glassSize: GlassSize;
  quantity: number;
}

/**
 * Glass size information
 */
export interface GlassSize {
  finalShutterWidth: number; // mm (shutter width after corrections)
  finalHeight: number; // mm (height after corrections)
  width: number; // mm (glass width after deduction a)
  height: number; // mm (glass height after deduction b)
  area: number; // mm²
  totalArea: number; // mm² (area × number of shutters × quantity)
}

/**
 * Accessory/hardware totals for a calculated section.
 *
 * `mosquitoCChannel` and `trackCap` are derived from the track type and
 * configuration rather than from per-window counts, so they stay as their own
 * fields. Everything else is keyed by HardwareItem.key — see
 * src/utils/hardwareCatalog.ts. Read `hardware` through
 * `normalizeHardwareCounts()`: worksheets saved before the catalog existed
 * persist the old five-named-field shape inside `Worksheet.data`.
 *
 * This is the single declaration of this shape — do not redeclare it locally.
 */
export interface SectionAccessories {
  mosquitoCChannel: number;
  trackCap: number;
  hardware: Record<string, number>;
}

export interface SectionResult {
  sectionId: string;
  sectionName: string;
  sectionTypeName?: string;
  materials: MaterialRequirement[];
  accessories: SectionAccessories;
  glassInfo: DimensionGlassInfo[];
  summary: {
    totalMaterial: number;
    totalStockUsed: number;
    totalWastage: number;
    wastagePercent: number;
    totalGlassArea?: number;
    totalMosquitoArea?: number;
    stockSummary: {
      [key: string]: number;
    };
    wastagePiecesSummary: {
      [key: string]: number;
    };
    frameStockSummary: {
      [key: string]: number;
    };
    shutterStockSummary: {
      [key: string]: number;
    };
    interlockStockSummary: {
      [key: string]: number;
    };
    trackRailStockSummary: {
      [key: string]: number;
    };
    mullionStockSummary: {
      [key: string]: number;
    };
    frameWastagePiecesSummary: {
      [key: string]: number;
    };
    shutterWastagePiecesSummary: {
      [key: string]: number;
    };
    interlockWastagePiecesSummary: {
      [key: string]: number;
    };
    trackRailWastagePiecesSummary: {
      [key: string]: number;
    };
    mullionWastagePiecesSummary: {
      [key: string]: number;
    };
  };
}

export interface CalculationResult {
  input: WindowInput;
  sectionResults: SectionResult[];
  combinedSummary: {
    totalMaterial: number;
    totalStockUsed: number;
    totalWastage: number;
    wastagePercent: number;
    totalGlassArea: number; // mm²
    totalMosquitoArea?: number; // mm²
    stockSummary: {
      [key: string]: number;
    };
    wastagePiecesSummary: {
      [key: string]: number;
    };
    frameStockSummary: {
      [key: string]: number;
    };
    shutterStockSummary: {
      [key: string]: number;
    };
    interlockStockSummary: {
      [key: string]: number;
    };
    trackRailStockSummary: {
      [key: string]: number;
    };
    mullionStockSummary: {
      [key: string]: number;
    };
    frameWastagePiecesSummary: {
      [key: string]: number;
    };
    shutterWastagePiecesSummary: {
      [key: string]: number;
    };
    interlockWastagePiecesSummary: {
      [key: string]: number;
    };
    trackRailWastagePiecesSummary: {
      [key: string]: number;
    };
    mullionWastagePiecesSummary: {
      [key: string]: number;
    };
  };
}
