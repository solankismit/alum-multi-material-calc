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
  allSections: SectionWithConfigs[],
  kerfWidthMm?: number
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
        hasTrackRail: section.hasTrackRail,
      },
      { ...sectionConfigData, systemType: sectionTypeData?.systemType },
      section.stockMap,
      kerfWidthMm ?? input.kerfWidthMm
    );

    const summary = calculateSectionSummary(materialsResult.materials);

    // Calculate glass area for this section
    let sectionGlassArea = 0;
    let sectionMosquitoArea = 0;

    materialsResult.glassInfo.forEach((glass) => {
      // Find the matching dimension to get quantity and sections count
      const dim = section.dimensions.find((d) => d.id === glass.dimensionId);
      const qty = dim?.quantity || 1;
      // area of one glass pane (single shutter, no quantity factor)
      const areaPerShutter = glass.glassSize.area;

      if (
        sectionConfigData.separateMosquitoNet &&
        section.configuration === "glass-mosquito"
      ) {
        // Determine total shutter count safely — never use parseInt on trackType
        // because "openable".charAt(0) → NaN.
        let totalShutterCount: number;
        if (section.trackType === "openable") {
          // For openable windows the number of panels is stored on the dimension
          totalShutterCount = (dim?.sections && dim.sections > 0 ? dim.sections : 2);
        } else if (section.trackType === "3-track") {
          totalShutterCount = 3;
        } else {
          // 2-track (default)
          totalShutterCount = 2;
        }
        const glassShuttersCount = totalShutterCount - 1; // 1 slot is the mosquito shutter

        // Compute areas locally — do NOT mutate glass.glassSize.totalArea because
        // that object lives inside sectionResults and downstream consumers rely on
        // its original value (all shutters × quantity).
        const glassTotalArea = areaPerShutter * glassShuttersCount * qty;
        const mosquitoTotalArea = areaPerShutter * qty; // always 1 mosquito shutter
        sectionGlassArea += glassTotalArea;
        sectionMosquitoArea += mosquitoTotalArea;
      } else {
        // All-glass or non-mosquito: use the pre-computed totalArea as-is
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
