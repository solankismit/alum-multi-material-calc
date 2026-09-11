import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { slugifyHardwareKey } from "@/utils/hardwareRates";

const createSchema = z.object({
    label: z.string().min(1, "Name is required"),
    unit: z.string().min(1).default("nos"),
    sortOrder: z.number().default(0),
});

export async function GET() {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await db.hardwareItem.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.userId || session.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json(
            { error: result.error.issues[0]?.message ?? "Invalid input", details: result.error.flatten() },
            { status: 400 }
        );
    }

    const { label, unit, sortOrder } = result.data;
    const baseKey = slugifyHardwareKey(label) || "hardware";

    // Resolve a globally-unique key without racing a concurrent create: let
    // Prisma surface the @@unique violation and retry with a numeric suffix,
    // rather than checking-then-inserting. Same approach as custom fields.
    let key = baseKey;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const item = await db.hardwareItem.create({
                data: { key, label, unit, sortOrder, isActive: true },
            });
            revalidateTag("hardware", {});
            return NextResponse.json({ item });
        } catch (error: unknown) {
            const isUniqueViolation =
                typeof error === "object" && error !== null && "code" in error &&
                (error as { code?: string }).code === "P2002";
            if (!isUniqueViolation) throw error;
            key = `${baseKey}_${attempt + 2}`;
        }
    }

    return NextResponse.json(
        { error: "Could not create a unique item for this name — try a different one." },
        { status: 409 }
    );
}
