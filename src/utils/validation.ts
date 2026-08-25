/** GSTIN: 2-digit state code, 10-char PAN, 1-char entity code, literal "Z", 1-char checksum. */
const GST_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/;

/**
 * Format check only — never a presence requirement. GST numbers are
 * genuinely optional (unregistered/individual clients, or a seller who
 * hasn't entered theirs yet), so an empty value is always valid. Callers
 * use this to show a non-blocking warning, never to reject a save — see
 * Tension 7 in PLAN-gst-invoicing-saas-features.md for why hard-blocking
 * would risk locking a user out of unrelated field edits over legacy data.
 */
export function isValidGstFormat(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return true;
  return GST_PATTERN.test(value.trim().toUpperCase());
}
