import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const profileSchema = z.object({
    name: z.string().optional(),
    company: z.string().optional(),
    businessAddress: z.string().optional(),
    businessPhone: z.string().optional(),
    // Format is checked client-side for an inline warning only — never
    // rejected here. See src/utils/validation.ts and Tension 7 in the plan:
    // hard-blocking on this single-error-message route would lock a user
    // out of unrelated field edits over a legacy non-conformant value.
    gstNumber: z.string().optional(),
    bankAccountName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankIfsc: z.string().optional(),
    bankName: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = profileSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        await db.user.update({
            where: { id: session.userId as string },
            data: {
                name: result.data.name,
                company: result.data.company,
                businessAddress: result.data.businessAddress,
                businessPhone: result.data.businessPhone,
                gstNumber: result.data.gstNumber,
                bankAccountName: result.data.bankAccountName,
                bankAccountNumber: result.data.bankAccountNumber,
                bankIfsc: result.data.bankIfsc,
                bankName: result.data.bankName,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
