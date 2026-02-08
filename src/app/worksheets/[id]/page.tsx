import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import WorksheetReport from "@/components/WorksheetReport";
import { WindowInput, CalculationResult } from "@/types";

export default async function WorksheetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await verifySession();
    const { id } = await params;

    if (!session?.userId) {
        redirect("/login");
    }

    const worksheet = await db.worksheet.findUnique({
        where: { id },
    });

    if (!worksheet) {
        notFound();
    }

    if (worksheet.userId !== session.userId) {
        return <div className="p-8 text-center text-red-600">You do not have permission to view this worksheet.</div>;
    }

    const worksheetData = worksheet.data as any;
    const input = worksheetData.input as WindowInput;
    const result = worksheetData.result as CalculationResult | null;

    // Extract section name context if available
    let sectionName = undefined;
    if (result && result.sectionResults?.length > 0) {
        sectionName = result.sectionResults[0].sectionName;
    }

    return (
        <WorksheetReport
            worksheetName={worksheet.name}
            createdAt={worksheet.createdAt}
            input={input}
            result={result}
            sectionName={sectionName}
        />
    );
}
