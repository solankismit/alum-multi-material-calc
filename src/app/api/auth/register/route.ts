import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saltAndHashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { z } from "zod";

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

        const user = await db.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                company,
                role: "USER", // Default role
            },
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
