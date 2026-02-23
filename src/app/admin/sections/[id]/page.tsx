import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import SectionForm from "../_components/SectionForm";

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
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Section: {section.name}</h1>
                <SectionForm initialData={section} isEdit />
            </div>
        </div>
    );
}
