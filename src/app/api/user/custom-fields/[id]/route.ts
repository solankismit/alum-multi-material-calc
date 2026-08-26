import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

// Partial update — every field optional, since this route also covers the
// single-field "disable"/"reorder" actions the settings UI performs, not
// just a full re-save of every property. SELECT-with-zero-options is only
// enforced when `type`/`options` are both present in the same request
// (matching create's rule) — a client sending only `sortOrder`, say,
// shouldn't have to resend the full definition to pass that check.
const updateSchema = z
    .object({
        label: z.string().trim().min(1).optional(),
        type: z.enum(["TEXT", "TEXTAREA", "SELECT"]).optional(),
        options: z.array(z.string().trim().min(1)).optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
    })
    .refine((data) => !(data.type === "SELECT" && data.options !== undefined && data.options.length === 0), {
        message: "A dropdown field needs at least one option before it can be saved.",
        path: ["options"],
    });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.customFieldDefinition.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input", details: result.error.flatten() }, { status: 400 });
    }

    // A SELECT definition can never end up with zero options, even when this
    // request only changes `type` (existing options carry over) or only
    // changes `options` (existing type carries over) — check the resolved
    // combination, not just what this one request happened to include.
    const resolvedType = result.data.type ?? existing.type;
    const resolvedOptions = result.data.options ?? existing.options;
    if (resolvedType === "SELECT" && resolvedOptions.length === 0) {
        return NextResponse.json({ error: "A dropdown field needs at least one option before it can be saved." }, { status: 400 });
    }

    const definition = await db.customFieldDefinition.update({
        where: { id },
        data: result.data,
    });
    return NextResponse.json({ definition });
}

// Deletes the FIELD DEFINITION only — never touches any Quotation.pricingData.
// A quotation that already saved a value under this field's key keeps that
// value forever (mergeItemDetails() preserves any key present in the saved
// data even once its definition is gone, and the print document falls back
// to the raw key as a label for it) — deleting a definition only removes it
// from the settings list and stops it appearing on NEW entries.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.customFieldDefinition.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.customFieldDefinition.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
