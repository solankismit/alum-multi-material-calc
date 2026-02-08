"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Trash2, FileText, ExternalLink, Plus } from "lucide-react";

interface Worksheet {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export default function WorksheetList() {
    const router = useRouter();
    const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchWorksheets();
    }, []);

    const fetchWorksheets = async () => {
        try {
            const res = await fetch("/api/worksheets");
            if (res.ok) {
                const data = await res.json();
                setWorksheets(data);
            }
        } catch (error) {
            console.error("Failed to fetch worksheets", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this worksheet?")) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/worksheets/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setWorksheets((prev) => prev.filter((w) => w.id !== id));
            } else {
                alert("Failed to delete worksheet");
            }
        } catch (error) {
            console.error("Error deleting worksheet", error);
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading worksheets...</div>;
    }

    if (worksheets.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No worksheets yet</h3>
                    <p className="mt-1 text-sm text-gray-500 max-w-sm">
                        Get started by creating a new calculation and saving it as a worksheet.
                    </p>
                    <div className="mt-6">
                        <Link href="/">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                New Calculation
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>My Worksheets</CardTitle>
                        <CardDescription>View and manage your saved calculations.</CardDescription>
                    </div>
                    <Link href="/">
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            New
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 border-b">
                            <tr>
                                <th className="py-3 px-4 font-medium">Name</th>
                                <th className="py-3 px-4 font-medium">Last Modified</th>
                                <th className="py-3 px-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {worksheets.map((worksheet) => (
                                <tr key={worksheet.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">
                                        <Link href={`/worksheets/${worksheet.id}`} className="hover:underline flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                                            {worksheet.name}
                                        </Link>
                                    </td>
                                    <td className="py-3 px-4 text-gray-500">
                                        {new Date(worksheet.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Link href={`/worksheets/${worksheet.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <ExternalLink className="h-4 w-4" />
                                                    <span className="sr-only">Open</span>
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(worksheet.id)}
                                                isLoading={deletingId === worksheet.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
