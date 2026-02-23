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
  trackType: TrackType;
  configuration: Configuration;
  numberOfShutters: number;
  /**
   * Single source of truth: calculates all final dimensions at once
   */
  calculateFinalDimensions: (
    sectionWidth: number,
    sectionHeight: number
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
  calculateGlassSize: (
    sectionWidth: number,
    sectionHeight: number,
    quantity: number
  ) => GlassSize;
}

/**
 * Get section configuration based on database config
 */
export function getSectionConfig(
  dbConfig: SectionConfiguration
): SectionTypeConfig {
  const trackType = dbConfig.trackType as TrackType;
  const configuration = dbConfig.configuration as Configuration;
  const numberOfShutters = trackType === "3-track" ? 3 : 2;
  const numberOfGlassShutters = configuration === "all-glass" ? numberOfShutters : numberOfShutters - 1;
  /**
   * Single source of truth for calculating final dimensions
   * This function calculates both shutter width and height with corrections applied
   */
  const calculateFinalDimensions = (
    sectionWidth: number,
    sectionHeight: number
  ): FinalDimensions => {
    let shutterWidth: number;

    if (trackType === "3-track" && configuration === "all-glass") {
      // For 3-track 3-glass: Final shutter width = (section width + z) / 3
      shutterWidth = (sectionWidth + dbConfig.threeTrackWidthAddition) / 3;
    } else {
      // For 3-track 2 glass-mosquito and 2-track 2 glass:
      // Final shutter width = (section width / 2) - x
      const baseShutterWidth = sectionWidth / 2;
      shutterWidth = baseShutterWidth - dbConfig.shutterWidthDeduction;
    }

    // Final height = height - y (applies to all section types)
    const height = sectionHeight - dbConfig.heightDeduction;

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
      // Track Rail Calculation
      // Quantity = 2 (for 2-track) or 3 (for 3-track) per window * total quantity
      // Length = sectionWidth - trackRailDeduction
      const countPerWindow = trackType === "3-track" ? 3 : 2;
      return {
        length: sectionWidth - (dbConfig.trackRailDeduction || 0),
        count: countPerWindow * quantity
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
      quantity: number
    ): GlassSize => {
      // Use single source of truth for final dimensions
      const finalDimensions = calculateFinalDimensions(
        sectionWidth,
        sectionHeight
      );

      // Glass Size = (Final Shutter Width - a) × (Final Height - b)
      const glassWidth =
        finalDimensions.shutterWidth - dbConfig.glassWidthDeduction;
      const glassHeight =
        finalDimensions.height - dbConfig.glassHeightDeduction;
      const glassArea = glassWidth * glassHeight;

      // Glasses = Glass Size × total number of shutters
      const totalArea = glassArea * numberOfShutters * quantity;

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
