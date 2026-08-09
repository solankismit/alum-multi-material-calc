import { getOwnedWorksheet } from "@/lib/data-fetchers";
import WorksheetReport from "@/components/WorksheetReport";
import { AccessDenied } from "@/components/layout/AccessDenied";

export default async function WorksheetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { forbidden, worksheet, data } = await getOwnedWorksheet(id);

    if (forbidden) {
        return <AccessDenied message="You do not have permission to view this worksheet." />;
    }

    const { input, result } = data;

    // Extract section name context if available
    let sectionName = undefined;
    if (result && result.sectionResults?.length > 0) {
        sectionName = result.sectionResults[0].sectionName;
    }

    return (
        <WorksheetReport
            worksheetId={worksheet.id}
            worksheetName={worksheet.name}
            createdAt={worksheet.createdAt}
            input={input}
            result={result}
            sectionName={sectionName}
        />
    );
}
