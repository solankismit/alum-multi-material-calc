/**
 * Configuration for different section types
 * This makes the system extensible for multiple section types
 */

import { GlassSize } from "../types";
import { SectionConfiguration } from "@prisma/client";

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
  const numberOfShutters = trackType === "3-track" ? 3 : 2;
  const numberOfGlassShutters = configuration === "all-glass" ? numberOfShutters : numberOfShutters - 1;
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
    calculateFinalDimensions,
    calculateInterlockLength: (height: number) => {
      // PR states "Length = shutter height." The final shutter height IS finalDimensions.height
      return calculateFinalDimensions(0, height).height;
    },
    calculateInterlockCount: (quantity: number) => {
      // PR states "Base interlock count on number of shutters per section height" Check if interlocks = shutters? Yes
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
