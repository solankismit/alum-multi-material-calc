import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const rateCardSchema = z.object({
    profileRateBasis: z.enum(["weight", "length"]).default("weight"),
    profileRatePerFt: z.number().min(0),
    profileRates: z.record(z.string(), z.number().min(0)).default({}),
    profileWeightPerFt: z.record(z.string(), z.number().min(0)).default({}),
    profileRatesPerKg: z.record(z.string(), z.number().min(0)).default({}),
    profileGroupCategories: z.array(z.string()).default([]),
    profileGroupLabel: z.string().min(1).default("Material"),
    profileGroupRatePerKg: z.number().min(0).default(0),
    glassRates: z.record(z.string(), z.number().min(0)),
    hardwareRates: z.record(z.string(), z.object({ label: z.string().min(1), rate: z.number().min(0) })).default({}),
    rubberRatePerSqft: z.number().min(0).default(0),
    brushRatePerSqft: z.number().min(0).default(0),
    coatingRatePerKg: z.number().min(0).default(0),
    coatingWastagePercent: z.number().min(0).default(4),
    laborMode: z.enum(["flat", "percentOfMaterial", "perSqft"]).default("flat"),
    laborDefault: z.number().min(0),
    laborPercent: z.number().min(0).default(0),
    laborRatePerSqft: z.number().min(0).default(0),
    overheadDefault: z.number().min(0),
    profitMarginDefault: z.number().min(0),
    taxRateDefault: z.number().min(0),
    termsText: z.string().default(""),
    hsnCodes: z.record(z.string(), z.string()).default({}),
    displayLengthUnit: z.enum(["mm", "ft", "inDora"]).default("mm"),
})
    // Weight-based pricing multiplies footage by kg/ft, so with no weights set
    // every profile silently costs ₹0. Refuse the combination outright rather
    // than falling back to ₹/ft, which would change prices unexplained.
    .refine(
        (data) =>
            data.profileRateBasis !== "weight" ||
            Object.values(data.profileWeightPerFt).some((kgPerFt) => kgPerFt > 0),
        {
            message:
                "Weight-based pricing needs at least one profile weight (kg/ft) set — otherwise every profile prices at ₹0.",
            path: ["profileWeightPerFt"],
        }
    );

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
        // Surface the specific message — several validations here (e.g. the
        // weight-basis guard) explain a real misconfiguration, and "Invalid
        // input" alone leaves the user with nothing to act on.
        return NextResponse.json(
            { error: result.error.issues[0]?.message ?? "Invalid input", details: result.error.flatten() },
            { status: 400 }
        );
    }

    const userId = session.userId as string;
    const rateCard = await db.rateCard.upsert({
        where: { userId },
        create: { userId, ...result.data },
        update: { ...result.data },
    });

    return NextResponse.json({ rateCard });
}
