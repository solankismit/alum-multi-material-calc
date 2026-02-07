/**
 * Configuration for different section types
 * This makes the system extensible for multiple section types
 */

import { GlassSize } from "../types";

export type TrackType = "2-track" | "3-track";
export type Configuration = "all-glass" | "glass-mosquito";

/**
 * Glass correction values for different section types
 * x: width correction for shutter (subtracted from shutter width)
 * y: height correction (subtracted from height)
 * z: width adjustment for 3-track 3-glass (added to section width before dividing)
 * a: glass width deduction
 * b: glass height deduction
 */
export interface GlassCorrections {
  x: number; // mm
  y: number; // mm
  z: number; // mm
  a: number; // mm
  b: number; // mm
}

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
    sectionHeight: number,
    configuration: Configuration
  ) => FinalDimensions;
  calculateInterlockLength: (height: number) => number;
  calculateInterlockCount: (quantity: number) => number;
  calculateAccessories: (
    configuration: Configuration,
    quantity: number
  ) => {
    mosquitoCChannel: number;
    trackCap: number;
  };
  getShutterLabel: (configuration: Configuration) => string;
  calculateGlassSize: (
    sectionWidth: number,
    sectionHeight: number,
    quantity: number
  ) => GlassSize;
}

/**
 * Glass correction values for 27mm Domal section type
 * TODO: Update these values with actual measurements
 */
const GLASS_CORRECTIONS_27MM_DOMAL: GlassCorrections = {
  x: 3.175, // TODO: Set actual value for width correction
  y: 66.675, // TODO: Set actual value for height correction
  z: 63.5, // TODO: Set actual value for 3-track 3-glass width adjustment
  a: 104.775, // TODO: Set actual value for glass width deduction
  b: 104.775, // TODO: Set actual value for glass height deduction
};

/**
 * Get section configuration based on track type and configuration
 */
export function getSectionConfig(
  trackType: TrackType,
  configuration: Configuration
): SectionTypeConfig {
  const numberOfShutters = trackType === "3-track" ? 3 : 2;
  const corrections = GLASS_CORRECTIONS_27MM_DOMAL;

  /**
   * Single source of truth for calculating final dimensions
   * This function calculates both shutter width and height with corrections applied
   */
  const calculateFinalDimensions = (
    sectionWidth: number,
    sectionHeight: number,
    config: Configuration
  ): FinalDimensions => {
    let shutterWidth: number;

    if (trackType === "3-track" && config === "all-glass") {
      // For 3-track 3-glass: Final shutter width = (section width + z) / 3
      shutterWidth = (sectionWidth + corrections.z) / 3;
    } else {
      // For 3-track 2 glass-mosquito and 2-track 2 glass:
      // Final shutter width = (section width / 2) - x
      const baseShutterWidth = sectionWidth / 2;
      shutterWidth = baseShutterWidth - corrections.x;
    }

    // Final height = height - y (applies to all section types)
    const height = sectionHeight - corrections.y;

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
      return trackType === "2-track" ? height * 2 : height;
    },
    calculateInterlockCount: (quantity: number) => {
      return trackType === "2-track" ? quantity : numberOfShutters * quantity;
    },
    calculateAccessories: (config: Configuration, quantity: number) => {
      return {
        mosquitoCChannel:
          config === "glass-mosquito" && trackType === "3-track" ? quantity : 0,
        trackCap: quantity,
      };
    },
    getShutterLabel: (config: Configuration) => {
      if (trackType === "3-track") {
        return config === "all-glass"
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
        sectionHeight,
        configuration
      );

      // Glass Size = (Final Shutter Width - a) × (Final Height - b)
      const glassWidth = finalDimensions.shutterWidth - corrections.a;
      const glassHeight = finalDimensions.height - corrections.b;
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
