/**
 * Configuration for different section types
 * This makes the system extensible for multiple section types
 */

import { GlassSize } from "../types";
import { SectionConfiguration } from "@prisma/client";
import {
  normalizeHardwareCounts,
  legacyHardwareCountsFromConfig,
  scaleHardwareCounts,
  type HardwareCountMap,
} from "./hardwareCatalog";

export type TrackType = "2-track" | "3-track";
export type Configuration = "all-glass" | "glass-mosquito";

/**
 * Final dimensions after applying corrections
 * Single source of truth for all dimension calculations
 */
export interface FinalDimensions {
  shutterWidth: number; // mm (final shutter width after corrections)
  height: number; // mm (final height after corrections)
}

export interface SectionTypeConfig {
  trackType: TrackType | string;
  configuration: Configuration | string;
  numberOfShutters: number; // Fallback for sliding
  hasTrackRail: boolean;
  /**
   * Single source of truth: calculates all final dimensions at once
   */
  calculateFinalDimensions: (
    sectionWidth: number,
    sectionHeight: number,
    numberOfSections?: number
  ) => FinalDimensions;
  calculateInterlockLength: (height: number) => number;
  calculateInterlockCount: (quantity: number) => number;
  calculateAccessories: (
    quantity: number
  ) => {
    mosquitoCChannel: number;
    trackCap: number;
  };
  /** Per-window hardware counts scaled by `quantity`, keyed by
   * HardwareItem.key. Empty when this configuration has no hardware set. */
  calculateHardwareCounts: (quantity: number) => HardwareCountMap;
  getShutterLabel: () => string;
  calculateTrackRailPieces: (sectionWidth: number, quantity: number) => { length: number; count: number };
  calculateMullionPieces: (sectionHeight: number, quantity: number, numberOfSections?: number) => { length: number; count: number } | null;
  calculateGlassSize: (
    sectionWidth: number,
    sectionHeight: number,
    quantity: number,
    numberOfSections?: number
  ) => GlassSize;
}

/**
 * Get section configuration based on database config
 */
export function getSectionConfig(
  dbConfig: SectionConfiguration & { systemType?: string }
): SectionTypeConfig {
  const trackType = dbConfig.trackType;
  const configuration = dbConfig.configuration;
  const isOpenable = dbConfig.systemType === "openable" || trackType === "openable";
  // For sliding windows: 2-track → 2 shutters, 3-track → 3 shutters.
  // For openable windows: the actual panel count comes from dim.sections and
  // overrides this fallback in all piece/area calculations.
  const numberOfShutters = trackType === "3-track" ? 3 : 2;
  const numberOfGlassShutters =
    configuration === "all-glass" ? numberOfShutters : numberOfShutters - 1;
  const dbConfigHardware = normalizeHardwareCounts(dbConfig.hardwareCounts);
  /**
   * Single source of truth for calculating final dimensions
   * This function calculates both shutter width and height with corrections applied
   */
  const calculateFinalDimensions = (
    sectionWidth: number,
    sectionHeight: number,
    numberOfSections: number = isOpenable ? 2 : numberOfShutters
  ): FinalDimensions => {
    let shutterWidth: number;
    let height: number;

    if (isOpenable) {
      const n = Math.max(1, numberOfSections);
      const outerDeduction = dbConfig.outerFrameWidthDeduction || 0;
      const mullionDeduction = dbConfig.mullionWidthDeduction || 0;
      shutterWidth = (sectionWidth - outerDeduction - (n - 1) * mullionDeduction) / n;
      height = sectionHeight - (dbConfig.outerFrameHeightDeduction || 0);
    } else {
      if (trackType === "3-track" && configuration === "all-glass") {
        shutterWidth = (sectionWidth + dbConfig.threeTrackWidthAddition) / 3;
      } else {
        const baseShutterWidth = sectionWidth / 2;
        shutterWidth = baseShutterWidth - dbConfig.shutterWidthDeduction;
      }
      height = sectionHeight - dbConfig.heightDeduction;
    }

    return {
      shutterWidth,
      height,
    };
  };

  return {
    trackType,
    configuration,
    numberOfShutters,
    hasTrackRail: dbConfig.hasTrackRail ?? true,
    calculateFinalDimensions,
    calculateInterlockLength: (height: number) => {
      // Interlock length = final shutter height (after the height deduction is applied).
      // We derive this directly from the deduction values rather than calling
      // calculateFinalDimensions with a dummy width=0, which produced a negative
      // shutterWidth side-effect for openable windows and was fragile.
      if (isOpenable) {
        return height - (dbConfig.outerFrameHeightDeduction || 0);
      }
      return height - dbConfig.heightDeduction;
    },
    calculateInterlockCount: (quantity: number) => {
      // One interlock per glass shutter per window
      return numberOfGlassShutters * quantity;
    },
    calculateTrackRailPieces: (sectionWidth: number, quantity: number) => {
      if (isOpenable) return { length: 0, count: 0 };
      const countPerWindow = trackType === "3-track" ? 3 : 2;
      return {
        length: sectionWidth - (dbConfig.trackRailDeduction || 0),
        count: countPerWindow * quantity
      };
    },
    calculateMullionPieces: (sectionHeight: number, quantity: number, numberOfSections: number = 1) => {
      if (!isOpenable || numberOfSections <= 1) return null;
      return {
        length: sectionHeight - (dbConfig.mullionLengthDeduction || 0),
        count: (numberOfSections - 1) * quantity
      };
    },
    calculateAccessories: (quantity: number) => {
      return {
        mosquitoCChannel:
          configuration === "glass-mosquito" && trackType === "3-track" ? quantity : 0,
        trackCap: quantity,
      };
    },
    calculateHardwareCounts: (quantity: number) => {
      // Prefer the dynamic map; fall back to the deprecated per-item columns so
      // a configuration the backfill hasn't reached still prices correctly.
      const perWindow = Object.keys(dbConfigHardware).length > 0
        ? dbConfigHardware
        : legacyHardwareCountsFromConfig(dbConfig);
      return scaleHardwareCounts(perWindow, quantity);
    },
    getShutterLabel: () => {
      if (trackType === "3-track") {
        return configuration === "all-glass"
          ? "Glass shutters (3)"
          : "Glass + Mosquito shutters (3)";
      } else {
        return "Glass shutters (2)";
      }
    },
    calculateGlassSize: (
      sectionWidth: number,
      sectionHeight: number,
      quantity: number,
      numberOfSections?: number
    ): GlassSize => {
      const finalDimensions = calculateFinalDimensions(
        sectionWidth,
        sectionHeight,
        numberOfSections
      );

      const glassWidth = finalDimensions.shutterWidth - dbConfig.glassWidthDeduction;
      const glassHeight = finalDimensions.height - dbConfig.glassHeightDeduction;
      const glassArea = glassWidth * glassHeight;

      const numShutters = isOpenable ? (numberOfSections || 2) : numberOfShutters;
      const totalArea = glassArea * numShutters * quantity;

      return {
        finalShutterWidth: finalDimensions.shutterWidth,
        finalHeight: finalDimensions.height,
        width: glassWidth,
        height: glassHeight,
        area: glassArea,
        totalArea: totalArea,
      };
    },
  };
}
