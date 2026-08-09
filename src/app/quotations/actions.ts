"use server";

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { QuotationStatus } from "@prisma/client";

export interface QuotationInput {
    worksheetId?: string | null;
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    deliveryAddress?: string;
    customerRef?: string;
    pricingData: unknown; // JSON structure for rates
    totalAmount: number;
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
        const session = await verifySession();
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
                pricingData: input.pricingData as never,
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

export async function duplicateQuotation(id: string) {
    try {
        const session = await verifySession();
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
        const session = await verifySession();
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
        const session = await verifySession();
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
        const session = await verifySession();
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
