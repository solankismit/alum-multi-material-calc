import type {
  MaterialRequirement,
  WindowDimension,
  DimensionGlassInfo,
  StockOption,
  MaterialStockMap
} from "../types";
import {
  optimizeStockUsage,
  optimizeCombinedStockUsage,
  type PieceRequirement,
} from "./stockOptimization";
import { getSectionConfig, type Configuration } from "./sectionConfig";
import { filterValidDimensions } from "./dimensionValidation";
import { mmToFeet } from "./formatters";
import { SectionConfiguration } from "@prisma/client";

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
    numberOfSections?: number
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
      dim.sections || undefined
    );

    const actualNumberOfShutters = dim.sections || numberOfShutters;

    heightPieces.push({
      length: finalDimensions.height,
      count: 2 * actualNumberOfShutters * quantity,
    });

    // If separateMosquitoNet is true and config is glass-mosquito:
    // Glass usually gets 4H, 4W (per window) for a 3-track or 2-track with mosquito?
    // Wait, the PR says: "generate separate Glass (4H/4W) and Mosquito (2H/2W) pieces if checked"
    // Let's pass `separateMosquitoNet` into `createShutterMaterial` instead of splitting it here in piece calculation,
    // because `calculateShutterPieces` just calculates base width/height.
    // Actually, `calculateShutterPieces` returns the *total* pieces as if they are same material.
    // If separate, we need to return `glassHeightPieces`, `glassWidthPieces`, `mosquitoHeightPieces`, `mosquitoWidthPieces`.
    // Let's modify `calculateShutterPieces` later, or just do it in `createShutterMaterial`.
    // Let's just pass `sectionConfigData` into the create functions from `calculateSectionMaterials`.
    widthPieces.push({
      length: finalDimensions.shutterWidth,
      count: 2 * actualNumberOfShutters * quantity,
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

function createFrameMaterial(
  widthPieces: PieceCount[],
  heightPieces: PieceCount[],
  differentFrameMaterials: boolean,
  stockMap?: MaterialStockMap
): MaterialRequirement[] {
  if (differentFrameMaterials) {
    const frameWidthReqs: PieceRequirement[] = widthPieces.map((p) => ({
      length: p.length, count: p.count, type: `width-${p.length}`
    }));
    const frameHeightReqs: PieceRequirement[] = heightPieces.map((p) => ({
      length: p.length, count: p.count, type: `height-${p.length}`
    }));

    const widthBreakdown = optimizeCombinedStockUsage(frameWidthReqs, stockMap?.['frameWidth']);
    const heightBreakdown = optimizeCombinedStockUsage(frameHeightReqs, stockMap?.['frameHeight']);

    return [
      {
        component: "Frame (Width)",
        totalRequired: widthPieces.reduce((sum, p) => sum + p.length * p.count, 0),
        stockBreakdown: widthBreakdown,
        description: `Frame Widths: ${widthPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")}`,
      },
      {
        component: "Frame (Height)",
        totalRequired: heightPieces.reduce((sum, p) => sum + p.length * p.count, 0),
        stockBreakdown: heightBreakdown,
        description: `Frame Heights: ${heightPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")}`,
      }
    ];
  }

  // Combined (default)
  const framePieceRequirements: PieceRequirement[] = [
    ...widthPieces.map((p) => ({ length: p.length, count: p.count, type: `width-${p.length}` })),
    ...heightPieces.map((p) => ({ length: p.length, count: p.count, type: `height-${p.length}` })),
  ];

  const frameBreakdown = optimizeCombinedStockUsage(framePieceRequirements, stockMap?.['frameWidth']);
  const frameTotal = widthPieces.reduce((sum, p) => sum + p.length * p.count, 0) + heightPieces.reduce((sum, p) => sum + p.length * p.count, 0);

  const frameWidthDesc = widthPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ");
  const frameHeightDesc = heightPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ");

  return [{
    component: "Frame (Combined)",
    totalRequired: frameTotal,
    stockBreakdown: frameBreakdown,
    description: `Frame: ${frameWidthDesc} width + ${frameHeightDesc} height`,
  }];
}

function createShutterMaterial(
  dimensions: WindowDimension[],
  sectionConfig: ReturnType<typeof getSectionConfig>,
  sectionConfigData: SectionConfiguration,
  stockMap?: MaterialStockMap
): MaterialRequirement[] {
  const { configuration } = sectionConfig;
  const separateMosquito = sectionConfigData.separateMosquitoNet && configuration === "glass-mosquito";

  if (separateMosquito) {
    // 2 shutters mosquito (2H, 2W per window)
    // N shutters glass (e.g. 2 for 2-track, 4 for 3-track? wait, 3-track has 2 glass 1 mosquito usually)
    // PR states: Glass (4H/4W) and Mosquito (2H/2W)
    const glassHeightPieces: PieceCount[] = [];
    const glassWidthPieces: PieceCount[] = [];
    const mosquitoHeightPieces: PieceCount[] = [];
    const mosquitoWidthPieces: PieceCount[] = [];

    dimensions.forEach(dim => {
      if (!dim.quantity || !dim.width || !dim.height) return;
      const finalDims = sectionConfig.calculateFinalDimensions(dim.width, dim.height, dim.sections || undefined);
      const actualNumberOfShutters = dim.sections || sectionConfig.numberOfShutters;

      // Mosquito
      mosquitoHeightPieces.push({ length: finalDims.height, count: 2 * dim.quantity });
      mosquitoWidthPieces.push({ length: finalDims.shutterWidth, count: 2 * dim.quantity });

      // Glass (assuming the rest of the shutters are glass)
      const glassShuttersCount = actualNumberOfShutters - 1;
      glassHeightPieces.push({ length: finalDims.height, count: 2 * glassShuttersCount * dim.quantity });
      glassWidthPieces.push({ length: finalDims.shutterWidth, count: 2 * glassShuttersCount * dim.quantity });
    });

    const glassReqs = [
      ...glassHeightPieces.map(p => ({ length: p.length, count: p.count, type: `g-height-${p.length}` })),
      ...glassWidthPieces.map(p => ({ length: p.length, count: p.count, type: `g-width-${p.length}` }))
    ];
    const mosqReqs = [
      ...mosquitoHeightPieces.map(p => ({ length: p.length, count: p.count, type: `m-height-${p.length}` })),
      ...mosquitoWidthPieces.map(p => ({ length: p.length, count: p.count, type: `m-width-${p.length}` }))
    ];

    return [
      {
        component: "Shutter - Glass",
        totalRequired: glassReqs.reduce((sum, p) => sum + p.length * p.count, 0),
        stockBreakdown: optimizeCombinedStockUsage(glassReqs, stockMap?.['shutterGlass']),
        description: `Shutter Glass: ${glassHeightPieces[0]?.count || 0}H + ${glassWidthPieces[0]?.count || 0}W`,
      },
      {
        component: "Shutter - Mosquito",
        totalRequired: mosqReqs.reduce((sum, p) => sum + p.length * p.count, 0),
        stockBreakdown: optimizeCombinedStockUsage(mosqReqs, stockMap?.['shutterMosquito']),
        description: `Shutter Mosquito: ${mosquitoHeightPieces[0]?.count || 0}H + ${mosquitoWidthPieces[0]?.count || 0}W`,
      }
    ];
  }

  // Combined fallback
  const { heightPieces, widthPieces } = calculateShutterPieces(
    dimensions, sectionConfig.numberOfShutters, sectionConfig.calculateFinalDimensions, configuration as Configuration
  );
  const shutterPieceRequirements: PieceRequirement[] = [
    ...heightPieces.map((p) => ({ length: p.length, count: p.count, type: `height-${p.length}` })),
    ...widthPieces.map((p) => ({ length: p.length, count: p.count, type: `width-${p.length}` })),
  ];
  return [{
    component: `Shutter (Combined) - ${sectionConfig.getShutterLabel()}`,
    totalRequired: shutterPieceRequirements.reduce((sum, p) => sum + p.length * p.count, 0),
    stockBreakdown: optimizeCombinedStockUsage(shutterPieceRequirements, stockMap?.['shutterGlass']),
    description: `Shutter: ${heightPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")} H + ${widthPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")} W`,
  }];
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
    description: `Interlock clips: ${interlockDesc}`,
  };
}

function createTrackRailMaterial(
  dimensions: WindowDimension[],
  calculateTrackRailPieces: (w: number, q: number) => { length: number; count: number },
  stockOptions?: StockOption[]
): MaterialRequirement | null {
  const pieces: PieceCount[] = [];
  dimensions.forEach(dim => {
    if (!dim.quantity || !dim.width) return;
    pieces.push(calculateTrackRailPieces(dim.width, dim.quantity));
  });

  if (pieces.length === 0 || pieces[0].length <= 0) return null;

  const reqs = pieces.map(p => ({ length: p.length, count: p.count, type: `track-${p.length}` }));
  return {
    component: "Track Rail",
    totalRequired: pieces.reduce((sum, p) => sum + p.length * p.count, 0),
    stockBreakdown: optimizeCombinedStockUsage(reqs, stockOptions),
    description: `Track Rails: ${pieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")}`,
  };
}
function createMullionMaterial(
  dimensions: WindowDimension[],
  calculateMullionPieces: (h: number, q: number, s?: number) => { length: number; count: number } | null,
  stockOptions?: StockOption[]
): MaterialRequirement | null {
  const pieces: PieceCount[] = [];
  dimensions.forEach(dim => {
    if (!dim.quantity || !dim.height || !dim.sections || dim.sections <= 1) return;
    const req = calculateMullionPieces(dim.height, dim.quantity, dim.sections);
    if (req && req.length > 0 && req.count > 0) pieces.push(req);
  });

  if (pieces.length === 0) return null;

  const reqs = pieces.map(p => ({ length: p.length, count: p.count, type: `mullion-${p.length}` }));
  return {
    component: "Mullion",
    totalRequired: pieces.reduce((sum, p) => sum + p.length * p.count, 0),
    stockBreakdown: optimizeCombinedStockUsage(reqs, stockOptions),
    description: `Mullion Pieces: ${pieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")}`,
  };
}


/**
 * Calculates materials for a section
 */
export function calculateSectionMaterials(
  section: {
    dimensions: WindowDimension[];
    trackType: "2-track" | "3-track" | "openable" | string;
    configuration: "all-glass" | "glass-mosquito" | string;
    systemType?: string;
  },
  sectionConfigData: SectionConfiguration & { systemType?: string },
  stockMap?: MaterialStockMap
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

    const glassSize = sectionConfig.calculateGlassSize(width, height, quantity, dim.sections || undefined);
    glassInfo.push({
      dimensionId: dim.id,
      glassSize,
      quantity,
    });
  });

  // Calculate frame pieces
  const { widthPieces, heightPieces } = calculateFramePieces(validDimensions);
  materials.push(...createFrameMaterial(widthPieces, heightPieces, sectionConfigData.differentFrameMaterials, stockMap));

  // Calculate shutter pieces
  materials.push(...createShutterMaterial(validDimensions, sectionConfig, sectionConfigData, stockMap));

  // Calculate interlock pieces
  const interlockPieces = calculateInterlockPieces(
    validDimensions,
    sectionConfig.calculateInterlockLength,
    sectionConfig.calculateInterlockCount
  );
  materials.push(createInterlockMaterial(interlockPieces, trackType, stockMap?.['interlock']));

  // Calculate track rail pieces
  if (sectionConfig.calculateTrackRailPieces && sectionConfig.calculateTrackRailPieces != null) {
    const trackRailMat = createTrackRailMaterial(validDimensions, sectionConfig.calculateTrackRailPieces, stockMap?.['trackRail']);
    if (trackRailMat) materials.push(trackRailMat);
  }

  // Calculate mullion pieces (Openable specific)
  if (sectionConfig.calculateMullionPieces) {
    const mullionMat = createMullionMaterial(validDimensions, sectionConfig.calculateMullionPieces, stockMap?.['mullion']);
    if (mullionMat) materials.push(mullionMat);
  }

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
