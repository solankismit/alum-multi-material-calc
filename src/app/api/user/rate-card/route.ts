import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const rateCardSchema = z.object({
    profileRatePerFt: z.number().min(0),
    profileRates: z.record(z.string(), z.number().min(0)).default({}),
    glassRates: z.record(z.string(), z.number().min(0)),
    hardwareRates: z.record(z.string(), z.object({ label: z.string().min(1), rate: z.number().min(0) })),
    laborMode: z.enum(["flat", "percentOfMaterial", "perSqft"]).default("flat"),
    laborDefault: z.number().min(0),
    laborPercent: z.number().min(0).default(0),
    laborRatePerSqft: z.number().min(0).default(0),
    overheadDefault: z.number().min(0),
    profitMarginDefault: z.number().min(0),
    taxRateDefault: z.number().min(0),
    termsText: z.string().default(""),
    hsnCodes: z.record(z.string(), z.string()).default({}),
});

export async function GET() {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateCard = await db.rateCard.findUnique({ where: { userId: session.userId as string } });
    return NextResponse.json({ rateCard });
}

export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = rateCardSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
    }

    const userId = session.userId as string;
    const rateCard = await db.rateCard.upsert({
        where: { userId },
        create: { userId, ...result.data },
        update: { ...result.data },
    });

    return NextResponse.json({ rateCard });
}
