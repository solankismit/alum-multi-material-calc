"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Plus, ArrowUp, ArrowDown } from "lucide-react";
import type { HardwareItemData } from "@/utils/hardwareCatalog";

interface HardwareCatalogFormProps {
    initial: HardwareItemData[];
}

export default function HardwareCatalogForm({ initial }: HardwareCatalogFormProps) {
    const router = useRouter();
    const [items, setItems] = useState(initial);
    const [newLabel, setNewLabel] = useState("");
    const [newUnit, setNewUnit] = useState("nos");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);

    const patchItem = async (id: string, updates: Partial<HardwareItemData>) => {
        setSaving(id);
        setError(null);
        try {
            const res = await fetch(`/api/admin/hardware/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            const body = await res.json();
            if (!res.ok) {
                setError(body.error ?? "Could not save that change.");
                return;
            }
            setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...body.item } : i)));
            router.refresh();
        } catch {
            setError("Could not save that change. Try again.");
        } finally {
            setSaving(null);
        }
    };

    const moveItem = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;
        const reordered = [...items];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        reordered.forEach((i, idx) => (i.sortOrder = idx));
        setItems(reordered);
        // Persist both swapped rows' new sortOrder.
        patchItem(reordered[index].id, { sortOrder: reordered[index].sortOrder });
        patchItem(reordered[target].id, { sortOrder: reordered[target].sortOrder });
    };

    const handleAdd = async () => {
        const label = newLabel.trim();
        if (!label) return;
        setError(null);
        setSaving("new");
        try {
            const res = await fetch("/api/admin/hardware", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label, unit: newUnit.trim() || "nos", sortOrder: items.length }),
            });
            const body = await res.json();
            if (!res.ok) {
                setError(body.error ?? "Could not add that item.");
                return;
            }
            setItems((prev) => [...prev, body.item]);
            setNewLabel("");
            setNewUnit("nos");
            router.refresh();
        } catch {
            setError("Could not add that item. Try again.");
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <div>
                    <h3 className="font-semibold text-slate-800">Hardware Items</h3>
                    <p className="text-xs text-slate-500">
                        Shared by every account. Each item gets a per-window quantity on a section
                        configuration and a ₹ rate on each user&apos;s own rate card — both matched
                        automatically, so adding an item here is all that&apos;s needed to start
                        pricing it.
                    </p>
                </div>

                {items.length > 0 ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <span className="w-16">Order</span>
                            <span className="flex-1">Name</span>
                            <span className="w-24">Unit</span>
                            <span className="w-20 text-center">Active</span>
                        </div>
                        {items.map((item, index) => (
                            <div key={item.id} className="flex items-center gap-2">
                                <div className="flex w-16 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => moveItem(index, -1)}
                                        disabled={index === 0 || saving !== null}
                                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        title="Move up"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveItem(index, 1)}
                                        disabled={index === items.length - 1 || saving !== null}
                                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        title="Move down"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>
                                <Input
                                    defaultValue={item.label}
                                    onBlur={(e) => {
                                        const label = e.target.value.trim();
                                        if (label && label !== item.label) patchItem(item.id, { label });
                                    }}
                                    className="flex-1"
                                />
                                <Input
                                    defaultValue={item.unit}
                                    onBlur={(e) => {
                                        const unit = e.target.value.trim();
                                        if (unit && unit !== item.unit) patchItem(item.id, { unit });
                                    }}
                                    className="w-24"
                                />
                                <label className="w-20 flex justify-center" title="Retire without deleting">
                                    <input
                                        type="checkbox"
                                        checked={item.isActive}
                                        onChange={(e) => patchItem(item.id, { isActive: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">
                        No hardware items yet. Add one below, or run{" "}
                        <code className="text-xs">npx tsx scripts/seed-hardware-catalog.ts</code> to
                        seed the standard set.
                    </p>
                )}

                {/* Retire rather than delete: the catalog is shared, so removing an
                    item would orphan every user's rate for it, and its key is stored
                    in quotations that are already saved. */}
                <p className="text-xs text-slate-400 pt-1 border-t border-slate-100">
                    Unticking <span className="font-medium">Active</span> retires an item — it
                    disappears from new quotations but keeps working on existing ones. Items are
                    never deleted, and renaming one is safe.
                </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Add an item</h3>
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <Label className="mb-1 text-xs">Name</Label>
                        <Input
                            placeholder="e.g. Wool Pile"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
                        />
                    </div>
                    <div className="w-28">
                        <Label className="mb-1 text-xs">Unit</Label>
                        <Input
                            placeholder="nos"
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                        />
                    </div>
                    <Button type="button" variant="outline" onClick={handleAdd} isLoading={saving === "new"}>
                        <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
