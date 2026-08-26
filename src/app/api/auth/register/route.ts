import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saltAndHashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { z } from "zod";
import { DEFAULT_CUSTOM_FIELDS } from "@/utils/customFields";

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().optional(),
    company: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = registerSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid input", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { email, password, name, company } = result.data;

        const existingUser = await db.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await saltAndHashPassword(password);

        // New users get the same starter field set existing users were
        // migrated onto — seeded in the SAME transaction as user.create so a
        // partial failure never leaves a real account with zero field
        // definitions and a broken-looking empty details panel.
        const user = await db.$transaction(async (tx) => {
            const created = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    company,
                    role: "USER", // Default role
                },
            });
            await tx.customFieldDefinition.createMany({
                data: DEFAULT_CUSTOM_FIELDS.map((field) => ({ ...field, userId: created.id })),
            });
            return created;
        });

        await createSession(user.id, user.role);

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
