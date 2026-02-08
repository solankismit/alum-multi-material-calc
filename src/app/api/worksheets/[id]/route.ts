import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";

// GET: Fetch a specific worksheet
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const worksheet = await db.worksheet.findUnique({
            where: { id },
        });

        if (!worksheet) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (worksheet.userId !== session.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(worksheet);
    } catch (error) {
        console.error("Failed to fetch worksheet:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a specific worksheet
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const worksheet = await db.worksheet.findUnique({
            where: { id },
        });

        if (!worksheet) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (worksheet.userId !== session.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.worksheet.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete worksheet:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
