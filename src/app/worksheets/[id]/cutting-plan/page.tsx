import { getOwnedWorksheet } from "@/lib/data-fetchers";
import WorksheetHub from "@/components/WorksheetHub";
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

    let sectionName = undefined;
    if (data.result && data.result.sectionResults?.length > 0) {
        sectionName = data.result.sectionResults[0].sectionName;
    }

    return (
        <WorksheetHub
            worksheetId={worksheet.id}
            worksheetName={worksheet.name}
            createdAt={worksheet.createdAt}
            input={data.input}
            result={data.result}
            sectionName={sectionName}
            initialTab="cutting-plan"
        />
    );
}
