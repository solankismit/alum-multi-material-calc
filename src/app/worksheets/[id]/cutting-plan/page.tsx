import { getOwnedWorksheet } from "@/lib/data-fetchers";
import CuttingPlanDocument from "@/components/CuttingPlanDocument";
import { AccessDenied } from "@/components/layout/AccessDenied";

export default async function CuttingPlanPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { forbidden, worksheet, data } = await getOwnedWorksheet(id);

    if (forbidden) {
        return <AccessDenied message="You do not have permission to view this worksheet." />;
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
