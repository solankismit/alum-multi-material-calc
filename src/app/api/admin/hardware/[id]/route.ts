import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";

// All-optional so a single-field edit (rename, reorder, retire) is one PATCH.
// `key` is deliberately NOT editable: it is the join to every user's rate and
// to per-window counts on section configurations, and to the keys stored
// verbatim inside historical Quotation.pricingData.
const updateSchema = z.object({
    label: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    sortOrder: z.number().optional(),
    isActive: z.boolean().optional(),
});

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json(
            { error: result.error.issues[0]?.message ?? "Invalid input", details: result.error.flatten() },
            { status: 400 }
        );
    }

    const existing = await db.hardwareItem.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = await db.hardwareItem.update({ where: { id }, data: result.data });
    revalidateTag("hardware", {});
    return NextResponse.json({ item });
}

// There is intentionally no DELETE.
//
// The catalog is global, so deleting an item would orphan every user's rate for
// it, and its key is stored verbatim in already-saved quotations. Retiring via
// PATCH { isActive: false } hides it from new entry while leaving historical
// data resolvable. This is a deliberate divergence from the per-user
// CustomFieldDefinition routes, which do support delete.
