import "server-only";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/session";
import type { WindowInput, CalculationResult } from "@/types";

export const getSectionTypes = unstable_cache(
    async () => {
        return await db.sectionType.findMany({
            where: { isActive: true },
            include: {
                configurations: true,

            },
        });
    },
    ["sections-list"], // key parts
    {
        revalidate: 3600, // revalidate every hour or on demand
        tags: ["sections"],
    }
);

export interface WorksheetData {
    input: WindowInput;
    result: CalculationResult | null;
}

export type OwnedWorksheetResult =
    | { forbidden: true; worksheet: null; data: null }
    | { forbidden: false; worksheet: Awaited<ReturnType<typeof db.worksheet.findUniqueOrThrow>>; data: WorksheetData };

/**
 * Loads a worksheet by id for the current session, enforcing ownership.
 * Redirects to /login if unauthenticated, 404s if the worksheet doesn't
 * exist, and returns `{ forbidden: true }` if it belongs to another user
 * (the caller renders the permission-denied UI, since that varies by page).
 *
 * Extracted from the byte-identical block previously duplicated across
 * worksheets/[id]/page.tsx, cutting-plan/page.tsx, and windows-list/page.tsx.
 */
export async function getOwnedWorksheet(id: string): Promise<OwnedWorksheetResult> {
    const session = await verifySession();
    const worksheet = await db.worksheet.findUnique({ where: { id } });

    if (!worksheet) {
        notFound();
    }

    if (worksheet.userId !== session.userId) {
        return { forbidden: true, worksheet: null, data: null };
    }

    return {
        forbidden: false,
        worksheet,
        data: worksheet.data as unknown as WorksheetData,
    };
}
