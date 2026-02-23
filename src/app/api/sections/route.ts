import { NextResponse } from "next/server";
import { getSectionTypes } from "@/lib/data-fetchers";

export const revalidate = 3600;

export async function GET() {
    try {
        const sectionTypes = await getSectionTypes();

        return NextResponse.json(sectionTypes);
    } catch (error) {
        console.error("Failed to fetch section types:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
