import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { customFieldDefinitionSchema, slugifyFieldKey } from "@/utils/customFields";

export async function GET() {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const definitions = await db.customFieldDefinition.findMany({
        where: { userId: session.userId as string },
        orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ definitions });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = customFieldDefinitionSchema.safeParse(body);

    if (!result.success) {
        return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input", details: result.error.flatten() }, { status: 400 });
    }

    const userId = session.userId as string;
    const { label, type, options, sortOrder } = result.data;
    const baseKey = slugifyFieldKey(label) || "field";

    // Resolve a key that's unique for this user without racing a concurrent
    // create — Prisma surfaces the @@unique([userId, key]) violation, we
    // retry once with a numeric suffix rather than pre-checking then inserting.
    let key = baseKey;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const definition = await db.customFieldDefinition.create({
                data: { userId, key, label, type, options, sortOrder, isActive: true },
            });
            return NextResponse.json({ definition });
        } catch (error: unknown) {
            const isUniqueViolation = typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
            if (!isUniqueViolation) throw error;
            key = `${baseKey}_${attempt + 2}`;
        }
    }
    return NextResponse.json({ error: "Could not create a unique field for this label — try a different name." }, { status: 409 });
}
