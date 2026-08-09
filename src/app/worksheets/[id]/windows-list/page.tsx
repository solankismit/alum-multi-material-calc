import { getOwnedWorksheet } from "@/lib/data-fetchers";
import WindowsListDocument from "@/components/WindowsListDocument";

export default async function WindowsListPage({
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
        <WindowsListDocument
            worksheetName={worksheet.name}
            createdAt={worksheet.createdAt}
            input={data.input}
        />
    );
}
