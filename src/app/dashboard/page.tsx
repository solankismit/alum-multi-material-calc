import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import WorksheetList from "./WorksheetList";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
    const session = await verifySession();
    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true, role: true, company: true },
    });

    if (!user) return redirect("/login");

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <Link href="/dashboard/settings">
                        <Button variant="outline" size="sm">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </Link>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">Welcome back, {user.name || user.email}!</h2>
                        <p className="text-gray-500 mt-1">{user.company ? user.company : "Manage your projects and worksheets."}</p>
                    </div>
                    <div className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                        {user.role}
                    </div>
                </div>

                <WorksheetList />
            </div>
        </div>
    );
}
