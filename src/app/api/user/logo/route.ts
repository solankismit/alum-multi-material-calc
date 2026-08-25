import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { uploadLogo, deleteLogoByUrl, MAX_LOGO_BYTES } from "@/lib/supabase";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.userId as string;

        const formData = await req.formData();
        const file = formData.get("logo");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Use PNG, JPG, or SVG." }, { status: 400 });
        }
        if (file.size > MAX_LOGO_BYTES) {
            return NextResponse.json({ error: "Logo must be under 2MB." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const newUrl = await uploadLogo(userId, buffer, file.type);

        const existing = await db.user.findUnique({ where: { id: userId }, select: { logoUrl: true } });
        await db.user.update({ where: { id: userId }, data: { logoUrl: newUrl } });
        // Cleanup-on-replace: delete the previous object so re-uploads never
        // leave orphaned files in storage (accepted into P1 scope).
        await deleteLogoByUrl(existing?.logoUrl);

        return NextResponse.json({ success: true, logoUrl: newUrl });
    } catch (error) {
        console.error("Logo upload error:", error);
        return NextResponse.json({ error: "Failed to upload logo. Please try again." }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.userId as string;

        const existing = await db.user.findUnique({ where: { id: userId }, select: { logoUrl: true } });
        await db.user.update({ where: { id: userId }, data: { logoUrl: null } });
        await deleteLogoByUrl(existing?.logoUrl);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Logo remove error:", error);
        return NextResponse.json({ error: "Failed to remove logo. Please try again." }, { status: 500 });
    }
}
