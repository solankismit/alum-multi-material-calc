"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface CustomerInput {
    name: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
}

export async function listCustomers() {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false as const, error: "Unauthorized", data: [] };
        }

        const customers = await db.customer.findMany({
            where: { userId: session.userId as string },
            orderBy: { name: "asc" },
        });

        return { success: true as const, data: customers };
    } catch (error) {
        console.error("List Customers Error:", error);
        return { success: false as const, error: "Failed to fetch customers", data: [] };
    }
}

/** Saves a new reusable Customer from the client-detail fields already typed
 * into a quotation — the "save this client for reuse" affordance. */
export async function createCustomer(input: CustomerInput) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }
        if (!input.name.trim()) {
            return { success: false, error: "Customer name is required" };
        }

        const customer = await db.customer.create({
            data: {
                userId: session.userId as string,
                name: input.name.trim(),
                phone: input.phone,
                address: input.address,
                gstNumber: input.gstNumber,
            },
        });

        revalidatePath("/quotations");
        return { success: true, data: customer };
    } catch (error) {
        console.error("Create Customer Error:", error);
        return { success: false, error: "Failed to save customer" };
    }
}
