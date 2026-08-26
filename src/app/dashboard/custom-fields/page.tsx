import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CustomFieldsForm from "./CustomFieldsForm";
import { PageContainer } from "@/components/layout/PageContainer";
import type { CustomFieldDefinitionData } from "@/utils/customFields";

export default async function CustomFieldsPage() {
    const session = await verifySession();
    if (!session?.userId) return redirect("/login");

    const rows = await db.customFieldDefinition.findMany({
        where: { userId: session.userId as string },
        orderBy: { sortOrder: "asc" },
    });

    const initial: CustomFieldDefinitionData[] = rows.map((row) => ({
        id: row.id,
        key: row.key,
        label: row.label,
        type: row.type,
        options: row.options,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
    }));

    return (
        <PageContainer size="medium" contentClassName="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Quote Item Fields</h1>
                    <p className="text-sm text-text-muted">
                        These fields appear on every quotation item&apos;s Details panel and on the printed document.
                        Disabling a field hides it from new entries; deleting it removes it from this list entirely.
                        Either way, values already saved on past quotations are never touched — they keep printing
                        exactly as before.
                    </p>
                </div>
                <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text">
                    <ArrowLeft className="w-4 h-4" /> Back to Settings
                </Link>
            </div>

            <CustomFieldsForm initial={initial} />
        </PageContainer>
    );
}
