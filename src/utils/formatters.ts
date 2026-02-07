export function mmToFeet(mm: number): string {
  const feet = mm / 304.8;
  return feet.toFixed(2);
}

export function feetToMm(feet: number): number {
  return feet * 304.8;
}

export function formatMm(mm: number): string {
  return mm.toFixed(3);
}

export function getWastageColor(percent: number): string {
  if (percent < 5) return "text-green-700 bg-green-50";
  if (percent < 10) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
}

export function getWastageBadgeColor(percent: number): string {
  if (percent < 5) return "bg-green-100 text-green-800";
  if (percent < 10) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}
