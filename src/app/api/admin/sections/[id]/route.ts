import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const sectionUpdateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    isActive: z.boolean(),
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
        trackRailDeduction: z.number().default(0),
        separateMosquitoNet: z.boolean().default(false),
        differentFrameMaterials: z.boolean().default(false),
    })),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await verifySession();
        if (!session?.userId || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const section = await db.sectionType.findUnique({
            where: { id },
            include: {
                configurations: true,
            },
        });

        if (!section) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(section);
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await verifySession();
        if (!session?.userId || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await db.sectionType.delete({
            where: { id },
        });

        revalidateTag("sections", {});

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await verifySession();
        if (!session?.userId || session.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = sectionUpdateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid input", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { name, isActive, trackTypes, configs, configurations } = result.data;

        // Full replacement of relations for simplicity (delete all -> create all)
        // In a real production app with massive data, we'd do differential updates.
        const updatedSection = await db.$transaction(async (tx) => {
            // Update basic info
            await tx.sectionType.update({
                where: { id },
                data: { name, isActive, trackTypes, configs }
            });

            // Replace configs
            await tx.sectionConfiguration.deleteMany({ where: { sectionTypeId: id } });
            await tx.sectionConfiguration.createMany({
                data: configurations.map(c => ({
                    ...c,
                    sectionTypeId: id,
                    shutterWidthDeduction: Number(c.shutterWidthDeduction),
                    heightDeduction: Number(c.heightDeduction),
                    threeTrackWidthAddition: Number(c.threeTrackWidthAddition),
                    glassWidthDeduction: Number(c.glassWidthDeduction),
                    glassHeightDeduction: Number(c.glassHeightDeduction),
                    trackRailDeduction: Number(c.trackRailDeduction || 0),
                    separateMosquitoNet: Boolean(c.separateMosquitoNet),
                    differentFrameMaterials: Boolean(c.differentFrameMaterials),
                }))
            });



            return await tx.sectionType.findUnique({
                where: { id },
                include: { configurations: true }
            });
        });

        revalidateTag("sections", {});

        return NextResponse.json(updatedSection);
    } catch (error) {
        console.error("Update error", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
