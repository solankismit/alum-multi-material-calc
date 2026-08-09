import type { MaterialCategory } from "../types";

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  frame: "Frame",
  shutter: "Shutter",
  interlock: "Interlock",
  trackRail: "Track Rail",
  mullion: "Mullion",
};

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  "frame",
  "shutter",
  "interlock",
  "trackRail",
  "mullion",
];

/**
 * Resolves a material's category, preferring the explicit `category` field.
 *
 * Worksheets saved before `category` existed only have a free-text
 * `component` string (e.g. "Shutter (Combined) - Glass shutters (2)"), so we
 * fall back to substring matching for that historical data.
 */
export function resolveMaterialCategory(mat: {
  category?: MaterialCategory;
  component: string;
}): MaterialCategory | "other" {
  if (mat.category) return mat.category;

  if (mat.component.includes("Frame")) return "frame";
  if (mat.component.includes("Shutter")) return "shutter";
  if (mat.component.includes("Interlock")) return "interlock";
  if (mat.component.includes("Track Rail")) return "trackRail";
  if (mat.component.includes("Mullion")) return "mullion";
  return "other";
}
