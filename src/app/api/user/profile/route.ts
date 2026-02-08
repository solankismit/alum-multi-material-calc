import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const profileSchema = z.object({
    name: z.string().optional(),
    company: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
    try {
        const session = await verifySession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = profileSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        await db.user.update({
            where: { id: session.userId },
            data: {
                name: result.data.name,
                company: result.data.company,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
