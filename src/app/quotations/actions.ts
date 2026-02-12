"use server";

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";

export interface QuotationInput {
    worksheetId: string;
    clientName: string;
    quotationNumber: string;
    pricingData: any; // JSON structure for rates
    totalAmount: number;
}

export async function createQuotation(input: QuotationInput) {
    try {
        const session = await verifySession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify worksheet ownership
        const worksheet = await db.worksheet.findFirst({
            where: {
                id: input.worksheetId,
                userId: session.userId,
            }
        });

        if (!worksheet) {
            return { success: false, error: "Worksheet not found or access denied" };
        }

        const quotation = await db.quotation.create({
            data: {
                worksheetId: input.worksheetId,
                clientName: input.clientName,
                quotationNumber: input.quotationNumber,
                pricingData: input.pricingData,
                totalAmount: input.totalAmount,
            }
        });

        return { success: true, id: quotation.id };
    } catch (error) {
        console.error("Create Quotation Error:", error);
        return { success: false, error: "Failed to create quotation" };
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
            include: { worksheet: true }
        });

        if (!quotation) return { success: false, error: "Not found" };

        if (quotation.worksheet.userId !== session.userId) {
            return { success: false, error: "Unauthorized" };
        }

        return { success: true, data: quotation };
    } catch (error) {
        console.error("Get Quotation Error:", error);
        return { success: false, error: "Failed to fetch quotation" };
    }
}
