export interface WindowDimension {
  id: string;
  height: number | null;
  width: number | null;
  quantity: number | null;
}

export interface WindowSection {
  id: string;
  name: string;
  dimensions: WindowDimension[];
  trackType: "2-track" | "3-track";
  configuration: "all-glass" | "glass-mosquito";
}

export interface WindowInput {
  sections: WindowSection[];
}

export interface StockOption {
  length: number;
  name: string;
  lengthFeet: number;
}

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
}

export interface MaterialRequirement {
  component: string;
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

export interface SectionResult {
  sectionId: string;
  sectionName: string;
  materials: MaterialRequirement[];
  accessories: {
    mosquitoCChannel: number;
    trackCap: number;
  };
  glassInfo: DimensionGlassInfo[];
  summary: {
    totalMaterial: number;
    totalStockUsed: number;
    totalWastage: number;
    wastagePercent: number;
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
    frameWastagePiecesSummary: {
      [key: string]: number;
    };
    shutterWastagePiecesSummary: {
      [key: string]: number;
    };
    interlockWastagePiecesSummary: {
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
    frameWastagePiecesSummary: {
      [key: string]: number;
    };
    shutterWastagePiecesSummary: {
      [key: string]: number;
    };
    interlockWastagePiecesSummary: {
      [key: string]: number;
    };
  };
}
