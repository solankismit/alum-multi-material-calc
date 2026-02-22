"use server";

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { WindowInput, CalculationResult, MaterialStockMap } from "@/types";
import { calculateMaterials } from "@/utils/calculations";

export async function combineWorksheets(worksheetIds: string[], newName: string) {
    try {
        const session = await verifySession();
        if (!session?.userId) {
            return { success: false, error: "Unauthorized" };
        }

        // 1. Fetch selected worksheets
        const worksheets = await db.worksheet.findMany({
            where: {
                id: { in: worksheetIds },
                userId: session.userId,
            },
        });

        if (worksheets.length === 0) {
            return { success: false, error: "No valid worksheets found" };
        }

        // 2. Merge Sections
        const mergedSections: WindowInput["sections"] = [];

        worksheets.forEach((ws) => {
            const data = ws.data as any;
            const input = data.input as WindowInput;

            if (input && Array.isArray(input.sections)) {
                input.sections.forEach(section => {
                    // Create a unique name if needed, or append origin
                    // For now, let's append the worksheet name to the section name for clarity
                    const newSection = {
                        ...section,
                        id: crypto.randomUUID(), // Always generate new ID to avoid collisions
                        name: `${section.name} (${ws.name})`,
                    };
                    mergedSections.push(newSection);
                });
            }
        });

        if (mergedSections.length === 0) {
            return { success: false, error: "No sections to combine" };
        }

        // 3. Fetch configs and stock options for recalculation
        const allSections = await db.sectionType.findMany({
            include: { configurations: true }
        });

        // 4. Recalculate
        const mergedInput: WindowInput = { sections: mergedSections };
        const calculationResult = calculateMaterials(mergedInput, allSections);

        // 5. Save new worksheet
        const newWorksheet = await db.worksheet.create({
            data: {
                userId: session.userId,
                name: newName,
                data: JSON.parse(JSON.stringify({
                    input: mergedInput,
                    result: calculationResult
                }))
            }
        });

        return { success: true, id: newWorksheet.id };

    } catch (error) {
        console.error("Combine error:", error);
        return { success: false, error: "Failed to combine worksheets" };
    }
}
