import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import SectionForm from "../_components/SectionForm";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function NewSectionPage() {
    const session = await verifySession();
    if (!session?.userId) {
        redirect("/login");
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (user?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const hardwareCatalog = await db.hardwareItem.findMany({ orderBy: { sortOrder: "asc" } });

    return (
        <PageContainer size="medium">
            <h1 className="text-2xl font-bold text-text mb-6">Create New Section</h1>
            <SectionForm hardwareCatalog={hardwareCatalog} />
        </PageContainer>
    );
}
