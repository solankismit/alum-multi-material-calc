/** Whether an ISSUED invoice locks from further edits — defaults to true
 * (the safe/compliant default) and is only disabled by explicitly setting
 * INVOICE_LOCK_AFTER_PRINT=false, per the plan's "keep it configurable from
 * ENV for now" decision. PAID/CANCELLED stay non-editable regardless. */
export function isInvoiceLockAfterPrintEnabled(): boolean {
    return process.env.INVOICE_LOCK_AFTER_PRINT !== "false";
}
