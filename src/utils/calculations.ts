import type { WindowInput, CalculationResult, SectionResult } from "../types";
import { calculateSectionMaterials } from "./materialCalculation";
import {
  calculateSectionSummary,
  combineSummaries,
  MaterialSummary,
} from "./summaryCalculation";

/**
 * Main function to calculate materials for multiple sections
 */
export function calculateMaterials(input: WindowInput): CalculationResult {
  const sectionResults: SectionResult[] = [];

  // Process each section
  input.sections.forEach((section) => {
    const materialsResult = calculateSectionMaterials({
      dimensions: section.dimensions,
      trackType: section.trackType,
      configuration: section.configuration,
    });

    const summary = calculateSectionSummary(materialsResult.materials);

    // Calculate glass area for this section
    const sectionGlassArea = materialsResult.glassInfo.reduce(
      (sum, glass) => sum + glass.glassSize.totalArea,
      0
    );
    summary.totalGlassArea = sectionGlassArea;

    // Create section result
    sectionResults.push({
      sectionId: section.id,
      sectionName: section.name,
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
