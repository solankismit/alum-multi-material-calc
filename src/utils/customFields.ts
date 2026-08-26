import { z } from "zod";

export type CustomFieldType = "TEXT" | "TEXTAREA" | "SELECT";

export interface CustomFieldDefinitionData {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  sortOrder: number;
  isActive: boolean;
}

/**
 * The starter field set every account gets — seeded once for existing users
 * (scripts/seed-custom-field-definitions.ts) and transactionally at
 * registration for new ones (src/app/api/auth/register/route.ts).
 *
 * Deliberately NOT all 10 keys of the old fixed ItemSpecDetails interface:
 * `profileBrand` and `series` never had a real input anywhere in the app
 * (verified against ManualSectionForm.tsx and QuotationBuilder.tsx) despite
 * being declared in the type and rendered on the printed document — seeding
 * them here would silently turn on two fields nobody could previously set.
 * If they're wanted, that's a deliberate "add a new field" action through
 * the settings UI, not a side effect of this seed set.
 *
 * `key` values match the exact JSON keys already used in shipped
 * `Quotation.pricingData` for these fields, so existing quotations keep
 * rendering identically once this feature ships.
 */
export const DEFAULT_CUSTOM_FIELDS: Omit<CustomFieldDefinitionData, "id">[] = [
  { key: "profileColor", label: "Profile Color", type: "TEXT", options: [], sortOrder: 0, isActive: true },
  { key: "glassSpec", label: "Glass Spec", type: "TEXT", options: [], sortOrder: 1, isActive: true },
  { key: "meshGrade", label: "Bug Mesh", type: "TEXT", options: [], sortOrder: 2, isActive: true },
  { key: "meshHandle", label: "Mesh Handle", type: "TEXT", options: [], sortOrder: 3, isActive: true },
  { key: "locking", label: "Locking", type: "TEXT", options: [], sortOrder: 4, isActive: true },
  { key: "handleColor", label: "Handle Color", type: "TEXT", options: [], sortOrder: 5, isActive: true },
  { key: "hinge", label: "Hinge", type: "TEXT", options: [], sortOrder: 6, isActive: true },
  { key: "notes", label: "Notes", type: "TEXTAREA", options: [], sortOrder: 7, isActive: true },
];

export const customFieldDefinitionSchema = z
  .object({
    key: z.string().trim().min(1).optional(),
    label: z.string().trim().min(1),
    type: z.enum(["TEXT", "TEXTAREA", "SELECT"]),
    options: z.array(z.string().trim().min(1)).default([]),
    sortOrder: z.number().default(0),
  })
  .refine((data) => data.type !== "SELECT" || data.options.length > 0, {
    message: "A dropdown field needs at least one option before it can be saved.",
    path: ["options"],
  });

/** A stable identifier derived from a label, used when the user doesn't
 * type one explicitly (the settings UI only asks for a label). */
export function slugifyFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
