import { getOwnedWorksheet } from "@/lib/data-fetchers";
import WindowsListDocument from "@/components/WindowsListDocument";
import { AccessDenied } from "@/components/layout/AccessDenied";

export default async function WindowsListPage({
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
        <WindowsListDocument
            worksheetId={worksheet.id}
            worksheetName={worksheet.name}
            createdAt={worksheet.createdAt}
            input={data.input}
        />
    );
}
