import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const createWorksheetSchema = z.object({
    name: z.string().min(1, "Name is required"),
    data: z.any(), // WindowInput + Result
});

// GET: List all worksheets for the authenticated user
export async function GET(req: NextRequest) {
    try {
        const session = await verifySession();
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
        const session = await verifySession();
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
                data,
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
