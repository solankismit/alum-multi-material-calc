import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const dimensionSchema = z.object({
    id: z.string(),
    height: z.number().nullable(),
    width: z.number().nullable(),
    quantity: z.number().nullable(),
    sections: z.number().nullable().optional(),
});

const sectionSchema = z.object({
    id: z.string(),
    sectionTypeId: z.string().optional(),
    name: z.string(),
    dimensions: z.array(dimensionSchema),
    trackType: z.string(),
    configuration: z.string(),
    hasTrackRail: z.boolean().optional(),
    mosquitoMeshGrade: z.string().optional(),
    stockMap: z.record(z.string(), z.unknown()).optional(),
});

const windowInputSchema = z.object({
    sections: z.array(sectionSchema),
    kerfWidthMm: z.number().optional(),
});

const createWorksheetSchema = z.object({
    name: z.string().min(1, "Name is required"),
    data: z.object({
        input: windowInputSchema,
        // The computed CalculationResult is server-derived and structurally
        // deep — validated as "some object" rather than mirroring every
        // nested summary field, which would drift out of sync with
        // src/types/index.ts as the calculation logic evolves.
        result: z.record(z.string(), z.unknown()).nullable(),
    }),
});

// GET: List all worksheets for the authenticated user
export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const worksheets = await db.worksheet.findMany({
            where: { userId: session.userId as string },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                name: true,
                updatedAt: true,
                createdAt: true,
                // Not selecting 'data' to keep listing lightweight
            },
        });

        return NextResponse.json(worksheets);
    } catch (error) {
        console.error("Failed to fetch worksheets:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST: Create a new worksheet
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = createWorksheetSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid input", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { name, data } = result.data;

        const worksheet = await db.worksheet.create({
            data: {
                userId: session.userId as string,
                name,
                data: JSON.parse(JSON.stringify(data)),
            },
        });

        return NextResponse.json(worksheet, { status: 201 });
    } catch (error) {
        console.error("Failed to create worksheet:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
