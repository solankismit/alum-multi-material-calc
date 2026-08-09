import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import SectionForm from "../_components/SectionForm";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function EditSectionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await verifySession();
    const { id } = await params;

    if (!session?.userId) {
        redirect("/login");
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (user?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const section = await db.sectionType.findUnique({
        where: { id },
        include: {
            configurations: true,
        },
    });

    if (!section) {
        notFound();
    }

    return (
        <PageContainer size="medium">
            <h1 className="text-2xl font-bold text-text mb-6">Edit Section: {section.name}</h1>
            <SectionForm initialData={section} isEdit />
        </PageContainer>
    );
}
