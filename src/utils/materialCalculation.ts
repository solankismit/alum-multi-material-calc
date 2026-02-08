import type {
  MaterialRequirement,
  WindowDimension,
  DimensionGlassInfo,
  StockOption,
} from "../types";
import {
  optimizeStockUsage,
  optimizeCombinedStockUsage,
  type PieceRequirement,
} from "./stockOptimization";
import { getSectionConfig, type Configuration } from "./sectionConfig";
import { filterValidDimensions } from "./dimensionValidation";
import { mmToFeet } from "./formatters";

interface PieceCount {
  length: number;
  count: number;
}

interface SectionMaterialsResult {
  materials: MaterialRequirement[];
  accessories: { mosquitoCChannel: number; trackCap: number };
  glassInfo: DimensionGlassInfo[];
}

/**
 * Calculates frame pieces from dimensions
 */
function calculateFramePieces(dimensions: WindowDimension[]): {
  widthPieces: PieceCount[];
  heightPieces: PieceCount[];
} {
  const widthPieces: PieceCount[] = [];
  const heightPieces: PieceCount[] = [];

  dimensions.forEach((dim) => {
    const height = dim.height!;
    const width = dim.width!;
    const quantity = dim.quantity!;

    widthPieces.push({ length: width, count: 2 * quantity });
    heightPieces.push({ length: height, count: 2 * quantity });
  });

  return { widthPieces, heightPieces };
}

/**
 * Calculates shutter pieces from dimensions
 * Uses final dimensions (single source of truth) with corrections applied
 */
function calculateShutterPieces(
  dimensions: WindowDimension[],
  numberOfShutters: number,
  calculateFinalDimensions: (
    sectionWidth: number,
    sectionHeight: number,
    config: Configuration
  ) => { shutterWidth: number; height: number },
  configuration: Configuration
): {
  heightPieces: PieceCount[];
  widthPieces: PieceCount[];
} {
  const heightPieces: PieceCount[] = [];
  const widthPieces: PieceCount[] = [];

  dimensions.forEach((dim) => {
    const height = dim.height!;
    const width = dim.width!;
    const quantity = dim.quantity!;

    // Use single source of truth for final dimensions
    const finalDimensions = calculateFinalDimensions(
      width,
      height,
      configuration
    );

    heightPieces.push({
      length: finalDimensions.height,
      count: 2 * numberOfShutters * quantity,
    });

    widthPieces.push({
      length: finalDimensions.shutterWidth,
      count: 2 * numberOfShutters * quantity,
    });
  });

  return { heightPieces, widthPieces };
}

/**
 * Calculates interlock pieces from dimensions
 */
function calculateInterlockPieces(
  dimensions: WindowDimension[],
  calculateInterlockLength: (height: number) => number,
  calculateInterlockCount: (quantity: number) => number
): PieceCount[] {
  const interlockPieces: PieceCount[] = [];

  dimensions.forEach((dim) => {
    const height = dim.height!;
    const quantity = dim.quantity!;

    interlockPieces.push({
      length: calculateInterlockLength(height),
      count: calculateInterlockCount(quantity),
    });
  });

  return interlockPieces;
}

/**
 * Calculates accessories from dimensions
 */
/**
 * Calculates accessories from dimensions
 */
function calculateAccessories(
  dimensions: WindowDimension[],
  calculateAccessoriesFn: (
    quantity: number
  ) => { mosquitoCChannel: number; trackCap: number }
): { mosquitoCChannel: number; trackCap: number } {
  let totalMosquitoCChannel = 0;
  let totalTrackCap = 0;

  dimensions.forEach((dim) => {
    const quantity = dim.quantity!;
    const accessories = calculateAccessoriesFn(quantity);
    totalMosquitoCChannel += accessories.mosquitoCChannel;
    totalTrackCap += accessories.trackCap;
  });

  return {
    mosquitoCChannel: totalMosquitoCChannel,
    trackCap: totalTrackCap,
  };
}

/**
 * Creates frame material requirement
 */
/**
 * Creates frame material requirement
 */
function createFrameMaterial(
  widthPieces: PieceCount[],
  heightPieces: PieceCount[],
  stockOptions?: StockOption[]
): MaterialRequirement {
  const framePieceRequirements: PieceRequirement[] = [
    ...widthPieces.map((p) => ({
      length: p.length,
      count: p.count,
      type: `width-${p.length}`,
    })),
    ...heightPieces.map((p) => ({
      length: p.length,
      count: p.count,
      type: `height-${p.length}`,
    })),
  ];

  const frameBreakdown = optimizeCombinedStockUsage(framePieceRequirements, stockOptions);
  const frameTotal =
    widthPieces.reduce((sum, p) => sum + p.length * p.count, 0) +
    heightPieces.reduce((sum, p) => sum + p.length * p.count, 0);

  const frameWidthDesc = widthPieces
    .map((p) => `${p.count}×${mmToFeet(p.length)}ft`)
    .join(" + ");
  const frameHeightDesc = heightPieces
    .map((p) => `${p.count}×${mmToFeet(p.length)}ft`)
    .join(" + ");

  return {
    component: "Frame (Combined)",
    totalRequired: frameTotal,
    stockBreakdown: frameBreakdown,
    description: `Frame: ${frameWidthDesc} width + ${frameHeightDesc} height`,
  };
}

/**
 * Creates shutter material requirement
 */
function createShutterMaterial(
  heightPieces: PieceCount[],
  widthPieces: PieceCount[],
  shutterLabel: string,
  stockOptions?: StockOption[]
): MaterialRequirement {
  const shutterPieceRequirements: PieceRequirement[] = [
    ...heightPieces.map((p) => ({
      length: p.length,
      count: p.count,
      type: `height-${p.length}`,
    })),
    ...widthPieces.map((p) => ({
      length: p.length,
      count: p.count,
      type: `width-${p.length}`,
    })),
  ];

  const shutterBreakdown = optimizeCombinedStockUsage(shutterPieceRequirements, stockOptions);
  const shutterTotal =
    heightPieces.reduce((sum, p) => sum + p.length * p.count, 0) +
    widthPieces.reduce((sum, p) => sum + p.length * p.count, 0);

  const shutterHeightDesc = heightPieces
    .map((p) => `${p.count}×${mmToFeet(p.length)}ft`)
    .join(" + ");
  const shutterWidthDesc = widthPieces
    .map((p) => `${p.count}×${mmToFeet(p.length)}ft`)
    .join(" + ");

  return {
    component: `Shutter (Combined) - ${shutterLabel}`,
    totalRequired: shutterTotal,
    stockBreakdown: shutterBreakdown,
    description: `Shutter: ${shutterHeightDesc} height + ${shutterWidthDesc} width`,
  };
}

/**
 * Creates interlock material requirement
 */
function createInterlockMaterial(
  interlockPieces: PieceCount[],
  trackType: string,
  stockOptions?: StockOption[]
): MaterialRequirement {
  const interlockPieceRequirements: PieceRequirement[] = interlockPieces.map(
    (p) => ({
      length: p.length,
      count: p.count,
      type: `interlock-${p.length}`,
    })
  );

  const uniqueInterlockLengths = new Set(interlockPieces.map((p) => p.length));
  let interlockBreakdown;
  const interlockTotal = interlockPieces.reduce(
    (sum, p) => sum + p.length * p.count,
    0
  );

  if (uniqueInterlockLengths.size === 1) {
    // All same length - use simple optimization
    const length = interlockPieces[0].length;
    const totalCount = interlockPieces.reduce((sum, p) => sum + p.count, 0);
    interlockBreakdown = optimizeStockUsage(length, totalCount, stockOptions);
  } else {
    // Different lengths - use combined optimization
    interlockBreakdown = optimizeCombinedStockUsage(interlockPieceRequirements, stockOptions);
  }

  const interlockDesc = interlockPieces
    .map((p) => `${p.count}×${mmToFeet(p.length)}ft`)
    .join(" + ");

  return {
    component: "Interlock",
    totalRequired: interlockTotal,
    stockBreakdown: interlockBreakdown,
    description:
      trackType === "2-track"
        ? `Interlock clips (intersection): ${interlockDesc}`
        : `Interlock clips: ${interlockDesc}`,
  };
}


import { SectionConfiguration } from "@prisma/client";

/**
 * Calculates materials for a section
 */
export function calculateSectionMaterials(
  section: {
    dimensions: WindowDimension[];
    trackType: "2-track" | "3-track";
    configuration: "all-glass" | "glass-mosquito";
  },
  sectionConfigData: SectionConfiguration,
  stockOptions?: StockOption[]
): SectionMaterialsResult {
  const { trackType, configuration, dimensions } = section;

  // Filter out invalid dimensions
  const validDimensions = filterValidDimensions(dimensions);

  if (validDimensions.length === 0) {
    return {
      materials: [],
      accessories: { mosquitoCChannel: 0, trackCap: 0 },
      glassInfo: [],
    };
  }

  const sectionConfig = getSectionConfig(sectionConfigData);
  const materials: MaterialRequirement[] = [];
  const glassInfo: DimensionGlassInfo[] = [];

  // Calculate glass sizes for each dimension
  validDimensions.forEach((dim) => {
    const height = dim.height!;
    const width = dim.width!;
    const quantity = dim.quantity!;

    const glassSize = sectionConfig.calculateGlassSize(width, height, quantity);
    glassInfo.push({
      dimensionId: dim.id,
      glassSize,
      quantity,
    });
  });

  // Calculate frame pieces
  const { widthPieces, heightPieces } = calculateFramePieces(validDimensions);
  materials.push(createFrameMaterial(widthPieces, heightPieces, stockOptions));

  // Calculate shutter pieces (using single source of truth for final dimensions)
  const { heightPieces: shutterHeightPieces, widthPieces: shutterWidthPieces } =
    calculateShutterPieces(
      validDimensions,
      sectionConfig.numberOfShutters,
      sectionConfig.calculateFinalDimensions,
      configuration
    );
  const shutterLabel = sectionConfig.getShutterLabel();
  materials.push(
    createShutterMaterial(shutterHeightPieces, shutterWidthPieces, shutterLabel, stockOptions)
  );

  // Calculate interlock pieces
  const interlockPieces = calculateInterlockPieces(
    validDimensions,
    sectionConfig.calculateInterlockLength,
    sectionConfig.calculateInterlockCount
  );
  materials.push(createInterlockMaterial(interlockPieces, trackType, stockOptions));

  // Calculate accessories
  const accessories = calculateAccessories(
    validDimensions,
    sectionConfig.calculateAccessories
  );

  return {
    materials,
    accessories,
    glassInfo,
  };
}
