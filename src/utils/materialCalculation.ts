import type {
  MaterialRequirement,
  WindowDimension,
  DimensionGlassInfo,
  StockOption,
  MaterialStockMap,
  SectionAccessories
} from "../types";
import { addHardwareCounts, type HardwareCountMap } from "./hardwareCatalog";
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
  accessories: SectionAccessories;
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
  ) => { mosquitoCChannel: number; trackCap: number },
  calculateHardwareCountsFn: (quantity: number) => HardwareCountMap
): SectionAccessories {
  let totalMosquitoCChannel = 0;
  let totalTrackCap = 0;
  const hardware: HardwareCountMap = {};

  dimensions.forEach((dim) => {
    const quantity = dim.quantity!;
    const accessories = calculateAccessoriesFn(quantity);
    totalMosquitoCChannel += accessories.mosquitoCChannel;
    totalTrackCap += accessories.trackCap;

    addHardwareCounts(hardware, calculateHardwareCountsFn(quantity));
  });

  return {
    mosquitoCChannel: totalMosquitoCChannel,
    trackCap: totalTrackCap,
    hardware,
  };
}

function createFrameMaterial(
  widthPieces: PieceCount[],
  heightPieces: PieceCount[],
  differentFrameMaterials: boolean,
  stockMap?: MaterialStockMap,
  kerfWidthMm?: number
): MaterialRequirement[] {
  if (differentFrameMaterials) {
    const frameWidthReqs: PieceRequirement[] = widthPieces.map((p) => ({
      length: p.length, count: p.count, type: `width-${p.length}`
    }));
    const frameHeightReqs: PieceRequirement[] = heightPieces.map((p) => ({
      length: p.length, count: p.count, type: `height-${p.length}`
    }));

    const widthBreakdown = optimizeCombinedStockUsage(frameWidthReqs, stockMap?.['frameWidth'], kerfWidthMm);
    const heightBreakdown = optimizeCombinedStockUsage(frameHeightReqs, stockMap?.['frameHeight'], kerfWidthMm);

    return [
      {
        component: "Frame (Width)",
        category: "frame",
        totalRequired: widthPieces.reduce((sum, p) => sum + p.length * p.count, 0),
        stockBreakdown: widthBreakdown,
        description: `Frame Widths: ${widthPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")}`,
      },
      {
        component: "Frame (Height)",
        category: "frame",
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

  // Widths and heights are optimized together here, so both of their stock
  // selections must be available to the pass — using only 'frameWidth' would
  // silently ignore whatever the user configured under 'frameHeight'.
  const combinedFrameStockOptions = stockMap
    ? Array.from(
        new Map(
          [...(stockMap['frameWidth'] || []), ...(stockMap['frameHeight'] || [])]
            .map((o) => [o.length, o])
        ).values()
      )
    : undefined;

  const frameBreakdown = optimizeCombinedStockUsage(framePieceRequirements, combinedFrameStockOptions, kerfWidthMm);
  const frameTotal = widthPieces.reduce((sum, p) => sum + p.length * p.count, 0) + heightPieces.reduce((sum, p) => sum + p.length * p.count, 0);

  const frameWidthDesc = widthPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ");
  const frameHeightDesc = heightPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ");

  return [{
    component: "Frame (Combined)",
    category: "frame",
    totalRequired: frameTotal,
    stockBreakdown: frameBreakdown,
    description: `Frame: ${frameWidthDesc} width + ${frameHeightDesc} height`,
  }];
}

function createShutterMaterial(
  dimensions: WindowDimension[],
  sectionConfig: ReturnType<typeof getSectionConfig>,
  sectionConfigData: SectionConfiguration,
  stockMap?: MaterialStockMap,
  kerfWidthMm?: number
): MaterialRequirement[] {
  const { configuration } = sectionConfig;
  const separateMosquito = sectionConfigData.separateMosquitoNet && configuration === "glass-mosquito";

  if (separateMosquito) {
    // Mosquito configuration: 1 mosquito shutter (2H + 2W pieces per window),
    // remainder are glass shutters ((numberOfShutters - 1) × 2H + 2W pieces per window).
    const glassHeightPieces: PieceCount[] = [];
    const glassWidthPieces: PieceCount[] = [];
    const mosquitoHeightPieces: PieceCount[] = [];
    const mosquitoWidthPieces: PieceCount[] = [];

    dimensions.forEach(dim => {
      if (!dim.quantity || !dim.width || !dim.height) return;
      const finalDims = sectionConfig.calculateFinalDimensions(dim.width, dim.height, dim.sections || undefined);
      const actualNumberOfShutters = dim.sections || sectionConfig.numberOfShutters;

      // 1 mosquito shutter per window (2 height + 2 width pieces)
      mosquitoHeightPieces.push({ length: finalDims.height, count: 2 * dim.quantity });
      mosquitoWidthPieces.push({ length: finalDims.shutterWidth, count: 2 * dim.quantity });

      // Remaining shutters are glass
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
        category: "shutter",
        totalRequired: glassReqs.reduce((sum, p) => sum + p.length * p.count, 0),
        stockBreakdown: optimizeCombinedStockUsage(glassReqs, stockMap?.['shutterGlass'], kerfWidthMm),
        description: `Shutter Glass: ${glassHeightPieces[0]?.count || 0}H + ${glassWidthPieces[0]?.count || 0}W`,
      },
      {
        component: "Shutter - Mosquito",
        category: "shutter",
        totalRequired: mosqReqs.reduce((sum, p) => sum + p.length * p.count, 0),
        stockBreakdown: optimizeCombinedStockUsage(mosqReqs, stockMap?.['shutterMosquito'], kerfWidthMm),
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
    category: "shutter",
    totalRequired: shutterPieceRequirements.reduce((sum, p) => sum + p.length * p.count, 0),
    stockBreakdown: optimizeCombinedStockUsage(shutterPieceRequirements, stockMap?.['shutterGlass'], kerfWidthMm),
    description: `Shutter: ${heightPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")} H + ${widthPieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")} W`,
  }];
}

/**
 * Creates interlock material requirement
 */
function createInterlockMaterial(
  interlockPieces: PieceCount[],
  trackType: string,
  stockOptions?: StockOption[],
  kerfWidthMm?: number
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
    interlockBreakdown = optimizeStockUsage(length, totalCount, stockOptions, kerfWidthMm);
  } else {
    // Different lengths - use combined optimization
    interlockBreakdown = optimizeCombinedStockUsage(interlockPieceRequirements, stockOptions, kerfWidthMm);
  }

  const interlockDesc = interlockPieces
    .map((p) => `${p.count}×${mmToFeet(p.length)}ft`)
    .join(" + ");

  return {
    component: "Interlock",
    category: "interlock",
    totalRequired: interlockTotal,
    stockBreakdown: interlockBreakdown,
    description: `Interlock clips: ${interlockDesc}`,
  };
}

function createTrackRailMaterial(
  dimensions: WindowDimension[],
  calculateTrackRailPieces: (w: number, q: number) => { length: number; count: number },
  stockOptions?: StockOption[],
  kerfWidthMm?: number
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
    category: "trackRail",
    totalRequired: pieces.reduce((sum, p) => sum + p.length * p.count, 0),
    stockBreakdown: optimizeCombinedStockUsage(reqs, stockOptions, kerfWidthMm),
    description: `Track Rails: ${pieces.map((p) => `${p.count}×${mmToFeet(p.length)}ft`).join(" + ")}`,
  };
}
function createMullionMaterial(
  dimensions: WindowDimension[],
  calculateMullionPieces: (h: number, q: number, s?: number) => { length: number; count: number } | null,
  stockOptions?: StockOption[],
  kerfWidthMm?: number
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
    category: "mullion",
    totalRequired: pieces.reduce((sum, p) => sum + p.length * p.count, 0),
    stockBreakdown: optimizeCombinedStockUsage(reqs, stockOptions, kerfWidthMm),
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
    hasTrackRail?: boolean;
  },
  sectionConfigData: SectionConfiguration & { systemType?: string },
  stockMap?: MaterialStockMap,
  kerfWidthMm?: number
): SectionMaterialsResult {
  const { trackType, configuration, dimensions } = section;

  // Filter out invalid dimensions
  const validDimensions = filterValidDimensions(dimensions);

  if (validDimensions.length === 0) {
    return {
      materials: [],
      accessories: { mosquitoCChannel: 0, trackCap: 0, hardware: {} },
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
  materials.push(...createFrameMaterial(widthPieces, heightPieces, sectionConfigData.differentFrameMaterials, stockMap, kerfWidthMm));

  // Calculate shutter pieces
  materials.push(...createShutterMaterial(validDimensions, sectionConfig, sectionConfigData, stockMap, kerfWidthMm));

  // Calculate interlock pieces
  const interlockPieces = calculateInterlockPieces(
    validDimensions,
    sectionConfig.calculateInterlockLength,
    sectionConfig.calculateInterlockCount
  );
  materials.push(createInterlockMaterial(interlockPieces, trackType, stockMap?.['interlock'], kerfWidthMm));

  // Calculate track rail pieces
  // Check both sectionConfig.hasTrackRail (from template) and section.hasTrackRail (from instance)
  const effectiveHasTrackRail = sectionConfig.hasTrackRail && (section.hasTrackRail !== false);

  if (effectiveHasTrackRail && sectionConfig.calculateTrackRailPieces && sectionConfig.calculateTrackRailPieces != null) {
    const trackRailMat = createTrackRailMaterial(validDimensions, sectionConfig.calculateTrackRailPieces, stockMap?.['trackRail'], kerfWidthMm);
    if (trackRailMat) materials.push(trackRailMat);
  }

  // Calculate mullion pieces (Openable specific)
  if (sectionConfig.calculateMullionPieces) {
    const mullionMat = createMullionMaterial(validDimensions, sectionConfig.calculateMullionPieces, stockMap?.['mullion'], kerfWidthMm);
    if (mullionMat) materials.push(mullionMat);
  }

  // Calculate accessories
  const accessories = calculateAccessories(
    validDimensions,
    sectionConfig.calculateAccessories,
    sectionConfig.calculateHardwareCounts
  );

  return {
    materials,
    accessories,
    glassInfo,
  };
}
