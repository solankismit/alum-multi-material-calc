import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Plus, Pencil, Box, Settings, Ruler } from "lucide-react";
import DeleteSectionButton from "./_components/DeleteSectionButton";

export default async function AdminSectionsPage() {
    const session = await verifySession();
    if (!session?.userId || session.role !== "ADMIN") {
        redirect("/login");
    }

    const sections = await db.sectionType.findMany({
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { configurations: true, stockLengths: true }
            }
        }
    });

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Manage Sections</h1>
                        <p className="text-slate-500 mt-1">Create and configure aluminium section systems</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/admin">
                            <Button variant="outline" className="bg-white">Back to Dashboard</Button>
                        </Link>
                        <Link href="/admin/sections/new">
                            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Section
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections.map((section) => (
                        <Card key={section.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl font-bold text-slate-800">
                                            {section.name}
                                        </CardTitle>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${section.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                                            }`}>
                                            {section.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                                        <Box className="w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center text-slate-600">
                                            <Settings className="w-4 h-4 mr-2" />
                                            Configurations
                                        </div>
                                        <span className="font-semibold text-slate-900">{section._count.configurations}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center text-slate-600">
                                            <Ruler className="w-4 h-4 mr-2" />
                                            Stock Lengths
                                        </div>
                                        <span className="font-semibold text-slate-900">{section._count.stockLengths}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 mb-1">Supported Tracks:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {section.trackTypes.map(track => (
                                                <span key={track} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                    {track}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/30 border-t border-slate-100 p-4 flex justify-between">
                                <DeleteSectionButton sectionId={section.id} sectionName={section.name} />
                                <Link href={`/admin/sections/${section.id}`}>
                                    <Button variant="outline" size="sm" className="border-slate-300 hover:bg-white hover:text-slate-900">
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Edit Details
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}

                    {/* Add New Card (Empty State Action) */}
                    <Link href="/admin/sections/new" className="group block h-full">
                        <div className="h-full min-h-[300px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-6 text-slate-400 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-sm">
                                <Plus className="w-6 h-6 text-slate-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-600 group-hover:text-slate-800">Add New Section</h3>
                            <p className="text-sm text-slate-500 mt-1">Create a new system configuration</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
