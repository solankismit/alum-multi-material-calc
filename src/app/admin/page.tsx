import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function AdminDashboardPage() {
    const session = await verifySession();

    if (!session?.userId) {
        redirect("/login");
    }

    // Double check role from DB
    const currentUser = await db.user.findUnique({
        where: { id: session.userId },
    });

    if (currentUser?.role !== "ADMIN") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-red-600">Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4">You do not have permission to view this page.</p>
                        <Link href="/dashboard">
                            <Button className="w-full">Return to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Fetch data
    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
    });

    const sections = await db.sectionType.findMany({
        include: {
            configurations: true,
            stockLengths: true,
        }
    });

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <Link href="/dashboard">
                        <Button variant="outline">Back to User Dashboard</Button>
                    </Link>
                </div>

                {/* Stats & Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Sections Card */}
                    <Link href="/admin/sections" className="block group">
                        <Card className="h-full border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer bg-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">
                                    System Configurations
                                </CardTitle>
                                <div className="p-2 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                                    <h4 className="w-4 h-4 text-indigo-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-2"><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>
                                    </h4>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{sections.length}</div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Active Section Types
                                </p>
                                <div className="mt-4 flex items-center text-sm text-indigo-600 font-medium">
                                    Manage Sections &rarr;
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Users Card */}
                    <div className="block">
                        <Card className="h-full border-slate-200 shadow-sm bg-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">
                                    Total Users
                                </CardTitle>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{users.length}</div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Registered Accounts
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recent Users Table */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">Recent Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Name</th>
                                        <th className="px-6 py-3 font-medium">Email</th>
                                        <th className="px-6 py-3 font-medium">Role</th>
                                        <th className="px-6 py-3 font-medium">Company</th>
                                        <th className="px-6 py-3 font-medium">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{user.company || "-"}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(user.createdAt).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
