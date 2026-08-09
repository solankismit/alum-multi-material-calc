import { getOwnedWorksheet } from "@/lib/data-fetchers";
import CuttingPlanDocument from "@/components/CuttingPlanDocument";

export default async function CuttingPlanPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { forbidden, worksheet, data } = await getOwnedWorksheet(id);

    if (forbidden) {
        return <div className="p-8 text-center text-red-600">You do not have permission to view this worksheet.</div>;
    }

    return (
        <CuttingPlanDocument
            worksheetId={worksheet.id}
            worksheetName={worksheet.name}
            createdAt={worksheet.createdAt}
            result={data.result}
        />
    );
}
