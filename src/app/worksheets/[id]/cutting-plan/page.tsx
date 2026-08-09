import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import CuttingPlanDocument from "@/components/CuttingPlanDocument";
import { CalculationResult } from "@/types";

export default async function CuttingPlanPage({
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
    const result = worksheetData.result as CalculationResult | null;

    return (
        <CuttingPlanDocument
            worksheetId={worksheet.id}
            worksheetName={worksheet.name}
            createdAt={worksheet.createdAt}
            result={result}
        />
    );
}
