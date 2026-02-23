"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/Dialog";
import { Trash2, FileText, ExternalLink, Plus, Layers, ClipboardList } from "lucide-react";
import { combineWorksheets } from "../worksheets/actions";


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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Combine Dialog State
    const [isCombineOpen, setIsCombineOpen] = useState(false);
    const [newWorksheetName, setNewWorksheetName] = useState("");
    const [isCombining, setIsCombining] = useState(false);

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
                setSelectedIds((prev) => prev.filter((i) => i !== id));
            } else {
                alert("Failed to delete worksheet");
            }
        } catch (error) {
            console.error("Error deleting worksheet", error);
        } finally {
            setDeletingId(null);
        }
    };

    // Selection Logic
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === worksheets.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(worksheets.map((w) => w.id));
        }
    };

    const handleOrderbook = () => {
        if (selectedIds.length === 0) return;
        const ids = selectedIds.join(",");
        router.push(`/worksheets/orderbook?ids=${ids}`);
    };

    const handleCombineTrigger = () => {
        setNewWorksheetName(`Combined Worksheet - ${new Date().toLocaleDateString()}`);
        setIsCombineOpen(true);
    };

    const handleCombineSubmit = async () => {
        if (!newWorksheetName.trim()) return;
        setIsCombining(true);
        try {
            // Server action call
            const result = await combineWorksheets(selectedIds, newWorksheetName);
            if (result.success && result.id) {
                router.push(`/worksheets/${result.id}`);
            } else {
                alert("Failed to combine worksheets: " + (result.error || "Unknown error"));
                setIsCombining(false);
            }
        } catch (error) {
            console.error("Combine error:", error);
            alert("An error occurred while combining.");
            setIsCombining(false);
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
        <Card className="relative">
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
            <CardContent className="pb-24">
                <div className="overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 md:hidden px-2 pt-2">
                        {worksheets.map((worksheet, idx) => (
                            <div
                                key={worksheet.id}
                                className={`border rounded-xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${selectedIds.includes(worksheet.id) ? "bg-indigo-50/50 border-indigo-200" : "bg-white border-gray-100 hover:border-gray-200 shadow-sm"}`}
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={selectedIds.includes(worksheet.id)}
                                            onCheckedChange={() => toggleSelect(worksheet.id)}
                                            aria-label={`Select ${worksheet.name}`}
                                        />
                                        <Link href={`/worksheets/${worksheet.id}`} className="font-semibold text-gray-900 group">
                                            <span className="flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                                                <FileText className="w-4 h-4 text-indigo-500" />
                                                <span className="truncate max-w-[200px]">{worksheet.name}</span>
                                            </span>
                                        </Link>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {new Date(worksheet.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50 mt-2">
                                    <Link href={`/worksheets/${worksheet.id}`}>
                                        <Button variant="ghost" size="sm" className="h-8 px-3 text-gray-600">
                                            Open
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
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 border-b">
                                <tr>
                                    <th className="py-3 px-4 w-10">
                                        <Checkbox
                                            checked={worksheets.length > 0 && selectedIds.length === worksheets.length}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Select all"
                                        />
                                    </th>
                                    <th className="py-3 px-4 font-medium">Name</th>
                                    <th className="py-3 px-4 font-medium">Last Modified</th>
                                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {worksheets.map((worksheet, idx) => (
                                    <tr
                                        key={worksheet.id}
                                        className={`group border-b last:border-0 transition-colors duration-200 animate-in fade-in slide-in-from-bottom-2 ${selectedIds.includes(worksheet.id) ? "bg-indigo-50/50" : "hover:bg-gray-50"}`}
                                        style={{ animationDelay: `${idx * 40}ms` }}
                                    >
                                        <td className="py-3 px-4">
                                            <Checkbox
                                                checked={selectedIds.includes(worksheet.id)}
                                                onCheckedChange={() => toggleSelect(worksheet.id)}
                                                aria-label={`Select ${worksheet.name}`}
                                            />
                                        </td>
                                        <td className="py-3 px-4 font-medium text-gray-900">
                                            <Link href={`/worksheets/${worksheet.id}`} className="flex items-center group transition-colors">
                                                <FileText className="w-4 h-4 mr-2 text-indigo-400 group-hover:text-indigo-600" />
                                                <span className="group-hover:text-indigo-600">{worksheet.name}</span>
                                            </Link>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500">
                                            {new Date(worksheet.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end space-x-2 opacity-100 group-hover:opacity-100 transition-opacity [&:has(:focus-visible)]:opacity-100">
                                                <div className="flex items-center justify-end space-x-2 transition-opacity focus-within:opacity-100 sm:opacity-100">
                                                    <Link href={`/worksheets/${worksheet.id}`}>
                                                        <Button variant="ghost" className="h-10 w-10 !p-3.5">
                                                            <ExternalLink className="h-5 w-5" />
                                                            <span className="sr-only">Open</span>
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-10 w-10 !p-3.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDelete(worksheet.id)}
                                                        isLoading={deletingId === worksheet.id}
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>

            {/* Batch Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-10 w-[90%] max-w-xl justify-between">
                    <span className="text-sm font-medium">{selectedIds.length} selected</span>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCombineTrigger}
                            className="!bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                        >
                            <Layers className="w-4 h-4 mr-2" />
                            Combine
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleOrderbook}
                            className="bg-white text-slate-900 hover:bg-slate-100"
                        >
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Orderbook
                        </Button>
                    </div>
                </div>
            )}

            {/* Combine Dialog */}
            <Dialog open={isCombineOpen} onOpenChange={setIsCombineOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Combine Worksheets</DialogTitle>
                        <DialogDescription>
                            Create a new worksheet containing all sections from the {selectedIds.length} selected worksheets.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            label="New Worksheet Name"
                            value={newWorksheetName}
                            onChange={(e) => setNewWorksheetName(e.target.value)}
                            placeholder="e.g. Combined Project A"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCombineOpen(false)} disabled={isCombining}>
                            Cancel
                        </Button>
                        <Button onClick={handleCombineSubmit} disabled={isCombining || !newWorksheetName.trim()} isLoading={isCombining}>
                            {isCombining ? "Combining..." : "Combine & Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
