"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { Prisma, type InvoiceStatus } from "@prisma/client";
import { getCompanySnapshot } from "@/utils/companyConfig";
import { pricingDataSchema, type PricingData, type TaxType } from "@/utils/quotationPricing";
import { getQuotation } from "@/app/quotations/actions";
import { isInvoiceLockAfterPrintEnabled } from "@/utils/invoiceConfig";

export interface InvoiceLineInput {
    description: string;
    quantity?: number;
    unit?: string;
    ratePerUnit?: number;
    taxableAmount: number;
    hsnCode?: string;
    gstRate?: number;
}

export interface InvoiceInput {
    quotationId?: string | null;
    customerId?: string | null;
    buyerName: string;
    buyerAddress?: string;
    buyerGstNumber?: string;
    buyerPhone?: string;
    gstRate?: number;
    taxType?: TaxType;
    invoicePrefix?: string;
    lines: InvoiceLineInput[];
}

/** Indian financial year for a date — Apr 1 to Mar 31, e.g. "2026-27" for
 * any date from 2026-04-01 through 2027-03-31. GST serials must be
 * consecutive within a financial year, not a calendar year. */
function getIndianFinancialYear(date: Date): string {
    const year = date.getFullYear();
    const startYear = date.getMonth() >= 3 ? year : year - 1; // month 3 = April (0-indexed)
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

function validateInvoiceInput(input: InvoiceInput): string | null {
    if (!input.buyerName.trim()) return "Buyer name is required";
    if (!input.lines || input.lines.length === 0) return "Add at least one line item";
    return null;
}

export async function createInvoice(input: InvoiceInput) {
    try {
        const session = await getSession();
        if (!session?.userId) return { success: false, error: "Unauthorized" };
        const userId = session.userId as string;

        const validationError = validateInvoiceInput(input);
        if (validationError) return { success: false, error: validationError };

        if (input.quotationId) {
            const quotation = await db.quotation.findFirst({ where: { id: input.quotationId, userId } });
            if (!quotation) return { success: false, error: "Quotation not found or access denied" };
        }
        if (input.customerId) {
            const customer = await db.customer.findFirst({ where: { id: input.customerId, userId } });
            if (!customer) return { success: false, error: "Customer not found or access denied" };
        }

        const invoice = await db.invoice.create({
            data: {
                userId,
                quotationId: input.quotationId || null,
                customerId: input.customerId || null,
                buyerName: input.buyerName,
                buyerAddress: input.buyerAddress,
                buyerGstNumber: input.buyerGstNumber,
                buyerPhone: input.buyerPhone,
                gstRate: input.gstRate,
                taxType: input.taxType ?? "CGST_SGST",
                invoicePrefix: input.invoicePrefix?.trim() || "INV",
                lines: {
                    create: input.lines.map((line, index) => ({
                        description: line.description,
                        quantity: line.quantity,
                        unit: line.unit,
                        ratePerUnit: line.ratePerUnit,
                        taxableAmount: line.taxableAmount,
                        hsnCode: line.hsnCode,
                        gstRate: line.gstRate,
                        sortOrder: index,
                    })),
                },
            },
        });

        revalidatePath("/invoices");
        return { success: true, id: invoice.id };
    } catch (error) {
        console.error("Create Invoice Error:", error);
        return { success: false, error: "Failed to create invoice" };
    }
}

/** Edits a DRAFT invoice in place — buyer, lines, and GST settings all stay
 * fully editable until finalize, per the plan's "editable until printed"
 * decision. Replaces the line set atomically rather than diffing it,
 * since invoices rarely have more than a handful of lines. */
export async function updateInvoice(id: string, input: InvoiceInput) {
    try {
        const session = await getSession();
        if (!session?.userId) return { success: false, error: "Unauthorized" };
        const userId = session.userId as string;

        const existing = await db.invoice.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return { success: false, error: "Not found or access denied" };
        if (existing.status === "PAID" || existing.status === "CANCELLED") {
            return { success: false, error: "This invoice is finalized and can no longer be edited." };
        }
        if (existing.status === "ISSUED" && isInvoiceLockAfterPrintEnabled()) {
            return { success: false, error: "This invoice has been issued and is locked from further edits." };
        }

        const validationError = validateInvoiceInput(input);
        if (validationError) return { success: false, error: validationError };

        if (input.customerId) {
            const customer = await db.customer.findFirst({ where: { id: input.customerId, userId } });
            if (!customer) return { success: false, error: "Customer not found or access denied" };
        }

        await db.$transaction([
            db.invoiceLine.deleteMany({ where: { invoiceId: id } }),
            db.invoice.update({
                where: { id },
                data: {
                    customerId: input.customerId || null,
                    buyerName: input.buyerName,
                    buyerAddress: input.buyerAddress,
                    buyerGstNumber: input.buyerGstNumber,
                    buyerPhone: input.buyerPhone,
                    gstRate: input.gstRate,
                    taxType: input.taxType ?? existing.taxType,
                    invoicePrefix: input.invoicePrefix?.trim() || "INV",
                    lines: {
                        create: input.lines.map((line, index) => ({
                            description: line.description,
                            taxableAmount: line.taxableAmount,
                            hsnCode: line.hsnCode,
                            gstRate: line.gstRate,
                            sortOrder: index,
                        })),
                    },
                },
            }),
        ]);

        revalidatePath("/invoices");
        revalidatePath(`/invoices/${id}`);
        return { success: true, id };
    } catch (error) {
        console.error("Update Invoice Error:", error);
        return { success: false, error: "Failed to update invoice" };
    }
}

/**
 * Assigns the invoice number and freezes the seller snapshot — the one
 * irreversible step in an invoice's life (see the plan's Preview vs. Issue
 * split). The financial-year check, the sequence increment, and the number
 * assignment all happen inside ONE serializable transaction: a crash or a
 * race between two finalize calls must never produce a duplicate or skipped
 * GST serial, which is a compliance problem, not just a UX bug.
 */
export async function finalizeInvoice(id: string) {
    try {
        const session = await getSession();
        if (!session?.userId) return { success: false, error: "Unauthorized" };
        const userId = session.userId as string;

        const existing = await db.invoice.findUnique({ where: { id }, include: { lines: true } });
        if (!existing || existing.userId !== userId) return { success: false, error: "Not found or access denied" };
        if (existing.status !== "DRAFT") return { success: false, error: "This invoice has already been finalized." };
        if (existing.lines.length === 0) return { success: false, error: "Add at least one line item before finalizing." };

        const fy = getIndianFinancialYear(new Date());

        let invoiceNumber: string | null = null;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                invoiceNumber = await db.$transaction(
                    async (tx) => {
                        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
                        const seq = user.invoiceSeqFY === fy ? user.invoiceSeq + 1 : 1;
                        await tx.user.update({ where: { id: userId }, data: { invoiceSeq: seq, invoiceSeqFY: fy } });

                        const number = `${existing.invoicePrefix}-${fy}-${String(seq).padStart(4, "0")}`;
                        const sellerSnapshot = getCompanySnapshot(user);

                        await tx.invoice.update({
                            where: { id },
                            data: {
                                invoiceNumber: number,
                                sellerSnapshot: sellerSnapshot as unknown as Prisma.InputJsonValue,
                                status: "ISSUED",
                                finalizedAt: new Date(),
                            },
                        });

                        return number;
                    },
                    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
                );
                break;
            } catch (error) {
                lastError = error;
            }
        }

        if (!invoiceNumber) throw lastError ?? new Error("Failed to assign invoice number");

        revalidatePath("/invoices");
        revalidatePath(`/invoices/${id}`);
        return { success: true, invoiceNumber };
    } catch (error) {
        console.error("Finalize Invoice Error:", error);
        return { success: false, error: "Failed to finalize invoice. Please try again." };
    }
}

/** Display-only preview of the invoice number finalize would assign right
 * now — never mutates anything. Used solely so the "Issue Invoice" confirm
 * dialog can name the number, per the plan's Preview/Issue split. The real
 * number is still decided atomically inside finalizeInvoice(); in the rare
 * case of a concurrent finalize in another tab, this preview could be off
 * by one, which only affects this confirmation label, not the actual
 * assigned (and correctly serialized) number. */
export async function previewNextInvoiceNumber(invoicePrefix: string) {
    const session = await getSession();
    if (!session?.userId) return { success: false as const, error: "Unauthorized" };

    const user = await db.user.findUnique({ where: { id: session.userId as string } });
    if (!user) return { success: false as const, error: "User not found" };

    const fy = getIndianFinancialYear(new Date());
    const seq = user.invoiceSeqFY === fy ? user.invoiceSeq + 1 : 1;
    return { success: true as const, invoiceNumber: `${invoicePrefix}-${fy}-${String(seq).padStart(4, "0")}` };
}

export async function updateInvoiceStatus(id: string, status: Extract<InvoiceStatus, "PAID" | "CANCELLED">) {
    try {
        const session = await getSession();
        if (!session?.userId) return { success: false, error: "Unauthorized" };

        const invoice = await db.invoice.findUnique({ where: { id } });
        if (!invoice || invoice.userId !== session.userId) return { success: false, error: "Not found or access denied" };
        if (invoice.status === "DRAFT") return { success: false, error: "Finalize this invoice before changing its status." };

        await db.invoice.update({ where: { id }, data: { status } });
        revalidatePath("/invoices");
        revalidatePath(`/invoices/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Update Invoice Status Error:", error);
        return { success: false, error: "Failed to update status" };
    }
}

export async function getInvoice(id: string) {
    try {
        const session = await getSession();
        if (!session?.userId) return { success: false, error: "Unauthorized" };

        const invoice = await db.invoice.findUnique({
            where: { id },
            include: {
                lines: { orderBy: { sortOrder: "asc" } },
                customer: true,
                quotation: { select: { id: true, quotationNumber: true } },
                user: {
                    select: {
                        company: true,
                        businessAddress: true,
                        businessPhone: true,
                        gstNumber: true,
                        name: true,
                        logoUrl: true,
                        bankAccountName: true,
                        bankAccountNumber: true,
                        bankIfsc: true,
                        bankName: true,
                    },
                },
            },
        });

        if (!invoice) return { success: false, error: "Not found" };
        if (invoice.userId !== session.userId) return { success: false, error: "Unauthorized" };

        return { success: true, data: invoice };
    } catch (error) {
        console.error("Get Invoice Error:", error);
        return { success: false, error: "Failed to fetch invoice" };
    }
}

export async function listInvoices() {
    try {
        const session = await getSession();
        if (!session?.userId) return { success: false as const, error: "Unauthorized", data: [] };

        const invoices = await db.invoice.findMany({
            where: { userId: session.userId as string },
            orderBy: { createdAt: "desc" },
        });

        return { success: true as const, data: invoices };
    } catch (error) {
        console.error("List Invoices Error:", error);
        return { success: false as const, error: "Failed to fetch invoices", data: [] };
    }
}

/** Prefills a new invoice's buyer/line data from a Quotation — the copy is a
 * one-time seed for the create form, not a live link; editing the quotation
 * afterward never changes an already-created invoice. Falls back to a
 * single line for legacy/flat quotations that predate per-section pricing. */
export async function getQuotationInvoiceDraft(quotationId: string) {
    const res = await getQuotation(quotationId);
    if (!res.success || !res.data) {
        return { success: false as const, error: res.error || "Quotation not found" };
    }
    const quotation = res.data;
    const parsed = pricingDataSchema.safeParse(quotation.pricingData);
    const pricing: PricingData | null = parsed.success ? parsed.data : null;

    const lines: InvoiceLineInput[] =
        pricing?.sections && pricing.sections.length > 0
            ? pricing.sections.map((section) => {
                const taxableAmount = Math.round(section.subtotal * 100) / 100;
                // Effective rate matches what QuotationDocument.tsx already shows
                // per section (subtotal / areaSqFt) — descriptive only, on this
                // invoice line just as it is on the quotation; taxableAmount
                // stays the source of truth for pricing, not quantity*rate.
                const ratePerUnit = section.areaSqFt > 0 ? Math.round((section.subtotal / section.areaSqFt) * 100) / 100 : undefined;
                return {
                    description: section.sectionName,
                    quantity: section.areaSqFt > 0 ? Math.round(section.areaSqFt * 100) / 100 : undefined,
                    unit: section.areaSqFt > 0 ? "Sq Ft" : undefined,
                    ratePerUnit,
                    taxableAmount,
                };
            })
            : [{ description: `Quotation ${quotation.quotationNumber ?? ""}`.trim(), taxableAmount: quotation.totalAmount }];

    return {
        success: true as const,
        data: {
            quotationId: quotation.id,
            customerId: quotation.customerId,
            buyerName: quotation.clientName || "",
            buyerAddress: quotation.clientAddress || "",
            buyerGstNumber: quotation.clientGstNumber || "",
            buyerPhone: quotation.clientPhone || "",
            lines,
        },
    };
}
