import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import WindowsListDocument from "@/components/WindowsListDocument";
import { WindowInput } from "@/types";

export default async function WindowsListPage({
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
    const input = worksheetData.input as WindowInput | null;

    return (
        <WindowsListDocument
            worksheetName={worksheet.name}
            createdAt={worksheet.createdAt}
            input={input}
        />
    );
}
