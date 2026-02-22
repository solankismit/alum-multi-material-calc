import type { WindowInput, CalculationResult, SectionResult, StockOption, MaterialStockMap, SectionWithConfigs } from "../types";
import { SectionConfiguration } from "@prisma/client";
import { calculateSectionMaterials } from "./materialCalculation";
import {
  calculateSectionSummary,
  combineSummaries,
  MaterialSummary,
} from "./summaryCalculation";

/**
 * Main function to calculate materials for multiple sections
 */
export function calculateMaterials(
  input: WindowInput,
  allSections: SectionWithConfigs[]
): CalculationResult {
  const sectionResults: SectionResult[] = [];

  // Process each section
  input.sections.forEach((section) => {
    const sectionTypeData = allSections.find((s) => s.id === section.sectionTypeId);
    const availableConfigs = sectionTypeData?.configurations || [];

    // Find matching config from DB data
    const sectionConfigData = availableConfigs.find(
      (c: SectionConfiguration) =>
        c.trackType === section.trackType &&
        c.configuration === section.configuration
    );

    if (!sectionConfigData) {
      console.warn(
        `No configuration found for ${section.trackType} - ${section.configuration}`
      );
      return;
    }

    const materialsResult = calculateSectionMaterials(
      {
        dimensions: section.dimensions,
        trackType: section.trackType,
        configuration: section.configuration,
      },
      sectionConfigData,
      section.stockMap
    );

    const summary = calculateSectionSummary(materialsResult.materials);

    // Calculate glass area for this section
    let sectionGlassArea = 0;
    let sectionMosquitoArea = 0;

    materialsResult.glassInfo.forEach((glass) => {
      // Find dimension to get quantity
      const dim = section.dimensions.find(d => d.id === glass.dimensionId);
      const qty = dim?.quantity || 1;
      const areaPerShutter = glass.glassSize.area;

      if (sectionConfigData.separateMosquitoNet && section.configuration === "glass-mosquito") {
        // 2 mosquito shutters, (numberOfShutters - 1) glass shutters based on my previous Shutter Pieces logic
        // Wait, previous logic was: 1 mosquito shutter, `numberOfShutters - 1` glass shutters per window
        // Ah, actually my shutter piece calculation did: 2 mosquito *pieces* per dimension (which is 1 mosquito shutter per window, right? Height is 2 pieces, width is 2 pieces = 1 shutter!).
        // So mosquito area is `areaPerShutter * 1 * qty`.
        // Let's verify: 
        // `mosquitoHeightPieces.push({ length: finalDims.height, count: 2 * dim.quantity })` -> this is 2 vertical pieces per window, which means 1 Mosquito Shutter per window!
        // Yes! 1 shutter has 2 height pieces and 2 width pieces.
        // So: glass shutters = `numberOfShutters - 1`
        const trackCount = parseInt(section.trackType.charAt(0));
        // We know for mosquito the shutter count is trackCount (2 track = 2 shutter, 3 track = 3 shutter usually). 
        // 1 mosquito shutter, so glass is trackCount - 1
        const glassShuttersCount = trackCount - 1;

        glass.glassSize.totalArea = areaPerShutter * glassShuttersCount * qty;
        sectionGlassArea += glass.glassSize.totalArea;
        sectionMosquitoArea += areaPerShutter * 1 * qty;
      } else {
        // All glass
        sectionGlassArea += glass.glassSize.totalArea;
      }
    });

    summary.totalGlassArea = sectionGlassArea;
    summary.totalMosquitoArea = sectionMosquitoArea;

    // Create section result
    sectionResults.push({
      sectionId: section.id,
      sectionName: section.name,
      sectionTypeName: sectionTypeData?.name,
      materials: materialsResult.materials,
      accessories: materialsResult.accessories,
      glassInfo: materialsResult.glassInfo,
      summary,
    });
  });

  // Combine all section summaries (after totalGlassArea is set)
  const summaries = sectionResults.map((sr) => sr.summary);
  const combinedSummary = combineSummaries(summaries as MaterialSummary[]);

  return {
    input,
    sectionResults,
    combinedSummary,
  };
}
