import { getOwnedWorksheet } from "@/lib/data-fetchers";
import WorksheetReport from "@/components/WorksheetReport";

export default async function WorksheetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { forbidden, worksheet, data } = await getOwnedWorksheet(id);

    if (forbidden) {
        return <div className="p-8 text-center text-red-600">You do not have permission to view this worksheet.</div>;
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
