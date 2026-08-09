export type LaborMode = "flat" | "percentOfMaterial" | "perSqft";

export function calculateLaborCost(
  mode: LaborMode,
  config: { flatAmount: number; percent: number; ratePerSqft: number },
  context: { materialCost: number; totalAreaSqFt: number }
): number {
  switch (mode) {
    case "percentOfMaterial":
      return context.materialCost * (config.percent / 100);
    case "perSqft":
      return context.totalAreaSqFt * config.ratePerSqft;
    case "flat":
    default:
      return config.flatAmount;
  }
}
