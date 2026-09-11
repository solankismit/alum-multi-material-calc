import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HardwareCatalogForm from "./HardwareCatalogForm";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function AdminHardwarePage() {
    const session = await verifySession();
    if (!session?.userId) {
        redirect("/login");
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (user?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const items = await db.hardwareItem.findMany({ orderBy: { sortOrder: "asc" } });

    return (
        <PageContainer size="medium" contentClassName="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Hardware Catalog</h1>
                    <p className="text-sm text-text-muted">
                        The shared list of hardware items that per-window quantities and per-user
                        rates are both keyed to.
                    </p>
                </div>
                <Link
                    href="/admin/sections"
                    className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Sections
                </Link>
            </div>

            <HardwareCatalogForm initial={items} />
        </PageContainer>
    );
}
