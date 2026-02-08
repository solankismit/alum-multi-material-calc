import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import SectionForm from "../_components/SectionForm";

export default async function NewSectionPage() {
    const session = await verifySession();
    if (!session?.userId) {
        redirect("/login");
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (user?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Section</h1>
                <SectionForm />
            </div>
        </div>
    );
}
