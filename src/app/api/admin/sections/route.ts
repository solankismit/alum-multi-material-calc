import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";

// Schema for validation
const sectionSchema = z.object({
    name: z.string().min(1, "Name is required"),
    isActive: z.boolean().default(true),
    systemType: z.string().default("sliding"),
    trackTypes: z.array(z.string()).default([]),
    configs: z.array(z.string()).default([]),
    configurations: z.array(z.object({
        trackType: z.string(),
        configuration: z.string(),
        shutterWidthDeduction: z.number().default(0),
        heightDeduction: z.number().default(0),
        threeTrackWidthAddition: z.number().default(0),
        glassWidthDeduction: z.number().default(0),
        glassHeightDeduction: z.number().default(0),
        outerFrameWidthDeduction: z.number().nullable().optional(),
        outerFrameHeightDeduction: z.number().nullable().optional(),
        mullionWidthDeduction: z.number().nullable().optional(),
        mullionLengthDeduction: z.number().nullable().optional(),
        trackRailDeduction: z.number().default(0),
        separateMosquitoNet: z.boolean().default(false),
        differentFrameMaterials: z.boolean().default(false),
        hasTrackRail: z.boolean().default(true),
    })),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.userId || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = sectionSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid input", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { name, isActive, systemType, trackTypes, configs, configurations } = result.data;

        // Transaction to create everything
        const section = await db.$transaction(async (tx) => {
            const newSection = await tx.sectionType.create({
                data: {
                    name,
                    isActive,
                    systemType,
                    trackTypes,
                    configs,
                    configurations: {
                        create: configurations
                    }
                },
                include: {
                    configurations: true
                }
            });
            return newSection;
        });

        revalidateTag("sections", {});
        return NextResponse.json(section, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Section name already exists" }, { status: 400 });
        }
        console.error("Create section error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
