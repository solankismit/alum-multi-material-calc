import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";

// Schema for validation
const sectionSchema = z.object({
    name: z.string().min(1, "Name is required"),
    isActive: z.boolean().default(true),
    trackTypes: z.array(z.string()).min(1),
    configs: z.array(z.string()).min(1),
    configurations: z.array(z.object({
        trackType: z.string(),
        configuration: z.string(),
        shutterWidthDeduction: z.number(),
        heightDeduction: z.number(),
        threeTrackWidthAddition: z.number(),
        glassWidthDeduction: z.number(),
        glassHeightDeduction: z.number(),
    })),
    stockLengths: z.array(z.object({
        length: z.number(),
        lengthFeet: z.number(),
    })),
});

export async function POST(req: NextRequest) {
    try {
        const session = await verifySession();
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

        const { name, isActive, trackTypes, configs, configurations, stockLengths } = result.data;

        // Transaction to create everything
        const section = await db.$transaction(async (tx) => {
            const newSection = await tx.sectionType.create({
                data: {
                    name,
                    isActive,
                    trackTypes,
                    configs,
                    configurations: {
                        create: configurations
                    },
                    stockLengths: {
                        create: stockLengths
                    }
                },
                include: {
                    configurations: true,
                    stockLengths: true
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
