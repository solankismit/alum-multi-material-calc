import type { WindowDimension } from "../types";

export interface DimensionValidationError {
  height?: string;
  width?: string;
  quantity?: string;
}

export interface DimensionValidationResult {
  isValid: boolean;
  errors: DimensionValidationError;
}

/**
 * Validation constraints for dimensions
 */
export const DIMENSION_CONSTRAINTS = {
  height: {
    min: 300, // mm
    max: 3000, // mm
  },
  width: {
    min: 300, // mm
    max: 5000, // mm
  },
  quantity: {
    min: 1,
    max: 100,
  },
} as const;

/**
 * Validates a single dimension
 */
export function validateDimension(
  dimension: WindowDimension,
  unitMode: "mm" | "ft" = "mm"
): DimensionValidationResult {
  const errors: DimensionValidationError = {};
  let isValid = true;

  // Check if dimension is completely blank
  const isCompletelyBlank =
    dimension.height === null &&
    dimension.width === null &&
    dimension.quantity === null;

  if (isCompletelyBlank) {
    return { isValid: true, errors: {} };
  }

  // Validate height
  if (dimension.height !== null) {
    if (
      dimension.height < DIMENSION_CONSTRAINTS.height.min ||
      dimension.height > DIMENSION_CONSTRAINTS.height.max
    ) {
      isValid = false;
      errors.height =
        unitMode === "mm"
          ? `Height must be between ${DIMENSION_CONSTRAINTS.height.min}mm and ${DIMENSION_CONSTRAINTS.height.max}mm`
          : "Height must be between 1ft and 10ft (approx.)";
    }
  } else {
    // Height is null but other fields have values - show error
    if (dimension.width !== null || dimension.quantity !== null) {
      isValid = false;
      errors.height = "Height is required";
    }
  }

  // Validate width
  if (dimension.width !== null) {
    if (
      dimension.width < DIMENSION_CONSTRAINTS.width.min ||
      dimension.width > DIMENSION_CONSTRAINTS.width.max
    ) {
      isValid = false;
      errors.width =
        unitMode === "mm"
          ? `Width must be between ${DIMENSION_CONSTRAINTS.width.min}mm and ${DIMENSION_CONSTRAINTS.width.max}mm`
          : "Width must be between 1ft and 16ft (approx.)";
    }
  } else {
    // Width is null but other fields have values - show error
    if (dimension.height !== null || dimension.quantity !== null) {
      isValid = false;
      errors.width = "Width is required";
    }
  }

  // Validate quantity
  if (dimension.quantity !== null) {
    if (
      dimension.quantity < DIMENSION_CONSTRAINTS.quantity.min ||
      dimension.quantity > DIMENSION_CONSTRAINTS.quantity.max
    ) {
      isValid = false;
      errors.quantity = `Quantity must be between ${DIMENSION_CONSTRAINTS.quantity.min} and ${DIMENSION_CONSTRAINTS.quantity.max}`;
    }
  } else {
    // Quantity is null but other fields have values - show error
    if (dimension.height !== null || dimension.width !== null) {
      isValid = false;
      errors.quantity = "Quantity is required";
    }
  }

  return { isValid, errors };
}

/**
 * Validates all dimensions in a section
 */
export function validateSectionDimensions(
  dimensions: WindowDimension[],
  unitMode: "mm" | "ft" = "mm"
): {
  isValid: boolean;
  errors: {
    [dimId: string]: DimensionValidationError;
  };
} {
  const errors: { [dimId: string]: DimensionValidationError } = {};
  let isValid = true;

  dimensions.forEach((dim) => {
    const result = validateDimension(dim, unitMode);
    if (!result.isValid) {
      isValid = false;
      errors[dim.id] = result.errors;
    }
  });

  return { isValid, errors };
}

/**
 * Checks if a dimension is valid (all required fields are present and within constraints)
 */
export function isValidDimension(dimension: WindowDimension): boolean {
  return (
    dimension.height !== null &&
    dimension.width !== null &&
    dimension.quantity !== null &&
    dimension.height >= DIMENSION_CONSTRAINTS.height.min &&
    dimension.height <= DIMENSION_CONSTRAINTS.height.max &&
    dimension.width >= DIMENSION_CONSTRAINTS.width.min &&
    dimension.width <= DIMENSION_CONSTRAINTS.width.max &&
    dimension.quantity >= DIMENSION_CONSTRAINTS.quantity.min &&
    dimension.quantity <= DIMENSION_CONSTRAINTS.quantity.max
  );
}

/**
 * Filters out invalid dimensions
 */
export function filterValidDimensions(
  dimensions: WindowDimension[]
): WindowDimension[] {
  return dimensions.filter(isValidDimension);
}
