"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import type { CustomFieldDefinitionData, CustomFieldType } from "@/utils/customFields";

interface CustomFieldsFormProps {
    initial: CustomFieldDefinitionData[];
}

const TYPE_LABELS: Record<CustomFieldType, string> = {
    TEXT: "Single-line text",
    TEXTAREA: "Multi-line text",
    SELECT: "Dropdown (list of options)",
};

export default function CustomFieldsForm({ initial }: CustomFieldsFormProps) {
    const router = useRouter();
    const [fields, setFields] = useState(initial);
    const [newLabel, setNewLabel] = useState("");
    const [newType, setNewType] = useState<CustomFieldType>("TEXT");
    const [newOptions, setNewOptions] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const patchField = async (id: string, updates: Partial<CustomFieldDefinitionData>) => {
        setSaving(id);
        setError(null);
        try {
            const res = await fetch(`/api/user/custom-fields/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            const body = await res.json();
            if (!res.ok) {
                setError(body.error ?? "Could not save that change.");
                return;
            }
            setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...body.definition } : f)));
            router.refresh();
        } catch {
            setError("Could not save that change. Try again.");
        } finally {
            setSaving(null);
        }
    };

    const deleteField = async (id: string) => {
        setSaving(id);
        setError(null);
        try {
            const res = await fetch(`/api/user/custom-fields/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setError(body.error ?? "Could not delete that field.");
                return;
            }
            setFields((prev) => prev.filter((f) => f.id !== id));
            router.refresh();
        } catch {
            setError("Could not delete that field. Try again.");
        } finally {
            setSaving(null);
        }
    };

    const moveField = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= fields.length) return;
        const reordered = [...fields];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        reordered.forEach((f, i) => (f.sortOrder = i));
        setFields(reordered);
        // Persist both swapped rows' new sortOrder.
        patchField(reordered[index].id, { sortOrder: reordered[index].sortOrder });
        patchField(reordered[target].id, { sortOrder: reordered[target].sortOrder });
    };

    const handleAdd = async () => {
        const label = newLabel.trim();
        if (!label) return;
        const options = newType === "SELECT" ? newOptions.split(",").map((o) => o.trim()).filter(Boolean) : [];
        if (newType === "SELECT" && options.length === 0) {
            setError("A dropdown field needs at least one option — separate them with commas.");
            return;
        }
        setError(null);
        setSaving("new");
        try {
            const res = await fetch("/api/user/custom-fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label, type: newType, options, sortOrder: fields.length }),
            });
            const body = await res.json();
            if (!res.ok) {
                setError(body.error ?? "Could not add that field.");
                return;
            }
            setFields((prev) => [...prev, body.definition]);
            setNewLabel("");
            setNewOptions("");
            setNewType("TEXT");
            router.refresh();
        } catch {
            setError("Could not add that field. Try again.");
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Your Fields</h3>
                {fields.length === 0 && <p className="text-sm text-slate-500">No fields yet — add one below.</p>}
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className={`flex items-center gap-2 p-2 rounded-md border border-slate-100 ${!field.isActive ? "opacity-50" : ""}`}>
                            <div className="flex flex-col">
                                <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <Input
                                value={field.label}
                                onChange={(e) => setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, label: e.target.value } : f)))}
                                onBlur={(e) => patchField(field.id, { label: e.target.value })}
                                className="flex-1"
                            />
                            <span className="text-xs text-slate-500 w-40 shrink-0">{TYPE_LABELS[field.type]}</span>
                            {field.type === "SELECT" && (
                                <span className="text-xs text-slate-400 max-w-[200px] truncate" title={field.options.join(", ")}>
                                    {field.options.join(", ")}
                                </span>
                            )}
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
                                <input
                                    type="checkbox"
                                    checked={field.isActive}
                                    disabled={saving === field.id}
                                    onChange={(e) => {
                                        setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, isActive: e.target.checked } : f)));
                                        patchField(field.id, { isActive: e.target.checked });
                                    }}
                                />
                                Active
                            </label>
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteId(field.id)}
                                disabled={saving === field.id}
                                className="text-slate-400 hover:text-red-500 shrink-0"
                                title="Delete field"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <ConfirmDialog
                open={confirmDeleteId !== null}
                onOpenChange={(open) => !open && setConfirmDeleteId(null)}
                title={`Delete "${fields.find((f) => f.id === confirmDeleteId)?.label ?? "this field"}"?`}
                description="This removes it from your settings and every quotation's entry form. Values already saved on past quotations are untouched — they keep printing exactly as before, just without this field in the list."
                confirmLabel="Delete field"
                variant="danger"
                onConfirm={() => {
                    if (confirmDeleteId) deleteField(confirmDeleteId);
                    setConfirmDeleteId(null);
                }}
            />

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Add a Field</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <Label className="mb-1 text-xs">Label</Label>
                        <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Grill Pattern" />
                    </div>
                    <div>
                        <Label className="mb-1 text-xs">Type</Label>
                        <Select value={newType} onValueChange={(v) => setNewType(v as CustomFieldType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TEXT">Single-line text</SelectItem>
                                <SelectItem value="TEXTAREA">Multi-line text</SelectItem>
                                <SelectItem value="SELECT">Dropdown (list of options)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {newType === "SELECT" && (
                        <div>
                            <Label className="mb-1 text-xs">Options (comma-separated)</Label>
                            <Input value={newOptions} onChange={(e) => setNewOptions(e.target.value)} placeholder="e.g. Black, White, Silver" />
                        </div>
                    )}
                </div>
                <Button type="button" onClick={handleAdd} isLoading={saving === "new"}>
                    <Plus className="w-4 h-4 mr-2" /> Add Field
                </Button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
