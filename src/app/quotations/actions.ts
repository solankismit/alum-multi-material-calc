"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { QuotationStatus } from "@prisma/client";
import { isQuotationLocked, pricingDataSchema } from "@/utils/quotationPricing";

export interface QuotationInput {
    worksheetId?: string | null;
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    deliveryAddress?: string;
    customerRef?: string;
    pricingData: unknown; // JSON structure for rates — validated against pricingDataSchema before it's persisted
    totalAmount: number;
}

/** Human-readable labels for the pricing schema's field names — used to turn a
 * raw Zod path like `sections.0.glass.rate` into "Section 1 → Glass → rate"
 * instead of exposing the internal field names to the user. */
const PRICING_FIELD_LABELS: Record<string, string> = {
    sections: "Section",
    glass: "Glass",
    frame: "Frame",
    mesh: "Mesh",
    hardware: "Hardware item",
    hardwareItems: "Hardware item",
    labor: "Labor",
    labour: "Labor",
    laborItems: "Labor item",
    tax: "Tax",
    discount: "Discount",
    profitMargin: "Profit margin",
    overhead: "Overhead",
    installation: "Installation",
    transportation: "Transportation",
    rate: "rate",
    quantity: "quantity",
    name: "name",
    height: "height",
    width: "width",
};

function friendlyPricingPathSegment(segment: PropertyKey): string {
    if (typeof segment === "number") return `#${segment + 1}`;
    const key = String(segment);
    return PRICING_FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function friendlyPricingIssueDetail(issue: { code: string; expected?: unknown; received?: unknown; minimum?: unknown; maximum?: unknown; message: string }): string {
    if (issue.code === "invalid_type") {
        if (issue.received === "nan" || issue.received === "undefined") return "enter a valid number";
        return `expected ${String(issue.expected)}, got ${String(issue.received)}`;
    }
    if (issue.code === "too_small") return `must be at least ${String(issue.minimum)}`;
    if (issue.code === "too_big") return `must be at most ${String(issue.maximum)}`;
    return issue.message;
}

/** Validates pricingData against the shared schema; returns a parsed, typed
 * value on success, or a plain-language (not raw Zod path/message) error. */
function parsePricingData(pricingData: unknown) {
    const result = pricingDataSchema.safeParse(pricingData);
    if (!result.success) {
        const issue = result.error.issues[0];
        const message = issue
            ? `${issue.path.map(friendlyPricingPathSegment).join(" → ") || "Pricing details"}: ${friendlyPricingIssueDetail(issue)}.`
            : "Some pricing details look invalid. Please review the form and try again.";
        return { success: false as const, error: message };
    }
    return { success: true as const, data: result.data };
}

/** Atomically reserves the next sequential quotation number for this user. */
async function nextQuotationNumber(userId: string): Promise<string> {
    const user = await db.user.update({
        where: { id: userId },
        data: { quotationSeq: { increment: 1 } },
        select: { quotationSeq: true },
    });
    const year = new Date().getFullYear();
    return `Q-${year}-${String(user.quotationSeq).padStart(4, "0")}`;
}

export async function createQuotation(input: QuotationInput) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }
        const userId = session.userId as string;

        // If a worksheet is referenced, verify ownership before attaching it.
        if (input.worksheetId) {
            const worksheet = await db.worksheet.findFirst({
                where: { id: input.worksheetId, userId },
            });
            if (!worksheet) {
                return { success: false, error: "Worksheet not found or access denied" };
            }
        }

        const parsed = parsePricingData(input.pricingData);
        if (!parsed.success) {
            return { success: false, error: `Invalid pricing data — ${parsed.error}` };
        }

        const quotationNumber = await nextQuotationNumber(userId);

        const quotation = await db.quotation.create({
            data: {
                userId,
                worksheetId: input.worksheetId || null,
                clientName: input.clientName,
                clientPhone: input.clientPhone,
                clientAddress: input.clientAddress,
                deliveryAddress: input.deliveryAddress,
                customerRef: input.customerRef,
                quotationNumber,
                pricingData: parsed.data as never,
                totalAmount: input.totalAmount,
            },
        });

        revalidatePath("/quotations");
        return { success: true, id: quotation.id, quotationNumber };
    } catch (error) {
        console.error("Create Quotation Error:", error);
        return { success: false, error: "Failed to create quotation" };
    }
}

/** Re-saves an existing (not-yet-locked) quotation with new pricing/client data. */
export async function updateQuotation(id: string, input: QuotationInput) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }
        const userId = session.userId as string;

        const existing = await db.quotation.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            return { success: false, error: "Not found or access denied" };
        }
        // Re-check server-side — the edit page also gates on this, but never
        // trust the client to enforce a lock.
        if (isQuotationLocked(existing)) {
            return { success: false, error: "This quotation has already been sent or printed and can no longer be edited. Duplicate it to make changes." };
        }

        if (input.worksheetId) {
            const worksheet = await db.worksheet.findFirst({
                where: { id: input.worksheetId, userId },
            });
            if (!worksheet) {
                return { success: false, error: "Worksheet not found or access denied" };
            }
        }

        const parsed = parsePricingData(input.pricingData);
        if (!parsed.success) {
            return { success: false, error: `Invalid pricing data — ${parsed.error}` };
        }

        await db.quotation.update({
            where: { id },
            data: {
                worksheetId: input.worksheetId || null,
                clientName: input.clientName,
                clientPhone: input.clientPhone,
                clientAddress: input.clientAddress,
                deliveryAddress: input.deliveryAddress,
                customerRef: input.customerRef,
                pricingData: parsed.data as never,
                totalAmount: input.totalAmount,
            },
        });

        revalidatePath("/quotations");
        revalidatePath(`/quotations/${id}`);
        return { success: true, id, quotationNumber: existing.quotationNumber };
    } catch (error) {
        console.error("Update Quotation Error:", error);
        return { success: false, error: "Failed to update quotation" };
    }
}

/** Marks a quotation as printed (idempotent) — this is what locks it from further edits. */
export async function markQuotationPrinted(id: string) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }

        const existing = await db.quotation.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.userId) {
            return { success: false, error: "Not found or access denied" };
        }

        if (!existing.printedAt) {
            await db.quotation.update({ where: { id }, data: { printedAt: new Date() } });
            revalidatePath(`/quotations/${id}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Mark Quotation Printed Error:", error);
        return { success: false, error: "Failed to update quotation" };
    }
}

export async function duplicateQuotation(id: string) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }
        const userId = session.userId as string;

        const source = await db.quotation.findUnique({ where: { id } });
        if (!source || source.userId !== userId) {
            return { success: false, error: "Not found or access denied" };
        }

        const quotationNumber = await nextQuotationNumber(userId);

        const copy = await db.quotation.create({
            data: {
                userId,
                worksheetId: source.worksheetId,
                clientName: source.clientName,
                clientPhone: source.clientPhone,
                clientAddress: source.clientAddress,
                deliveryAddress: source.deliveryAddress,
                customerRef: source.customerRef,
                quotationNumber,
                status: "DRAFT",
                pricingData: source.pricingData as never,
                totalAmount: source.totalAmount,
            },
        });

        revalidatePath("/quotations");
        return { success: true, id: copy.id };
    } catch (error) {
        console.error("Duplicate Quotation Error:", error);
        return { success: false, error: "Failed to duplicate quotation" };
    }
}

export async function getQuotation(id: string) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }

        const quotation = await db.quotation.findUnique({
            where: { id },
            include: {
                worksheet: true,
                user: { select: { company: true, businessAddress: true, businessPhone: true, gstNumber: true, name: true } },
            },
        });

        if (!quotation) return { success: false, error: "Not found" };
        if (quotation.userId !== session.userId) {
            return { success: false, error: "Unauthorized" };
        }

        return { success: true, data: quotation };
    } catch (error) {
        console.error("Get Quotation Error:", error);
        return { success: false, error: "Failed to fetch quotation" };
    }
}

export async function listQuotations() {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" as const, data: [] };
        }

        const quotations = await db.quotation.findMany({
            where: { userId: session.userId as string },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, data: quotations };
    } catch (error) {
        console.error("List Quotations Error:", error);
        return { success: false, error: "Failed to fetch quotations" as const, data: [] };
    }
}

export async function updateQuotationStatus(id: string, status: QuotationStatus) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }

        const quotation = await db.quotation.findUnique({ where: { id } });
        if (!quotation || quotation.userId !== session.userId) {
            return { success: false, error: "Not found or access denied" };
        }

        await db.quotation.update({ where: { id }, data: { status } });
        revalidatePath("/quotations");
        revalidatePath(`/quotations/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Update Quotation Status Error:", error);
        return { success: false, error: "Failed to update status" };
    }
}
