"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Plus, Trash2, Save } from "lucide-react";

interface RateCardData {
    profileRatePerFt: number;
    glassRates: Record<string, number>;
    hardwareRates: Record<string, number>;
    laborDefault: number;
    overheadDefault: number;
    profitMarginDefault: number;
    taxRateDefault: number;
}

interface RateCardFormProps {
    initial: RateCardData;
}

function NamedRateList({
    title,
    hint,
    placeholder,
    rates,
    onChange,
}: {
    title: string;
    hint: string;
    placeholder: string;
    rates: Record<string, number>;
    onChange: (next: Record<string, number>) => void;
}) {
    const [newName, setNewName] = useState("");
    const entries = Object.entries(rates);

    const handleAdd = () => {
        const name = newName.trim();
        if (!name || name in rates) return;
        onChange({ ...rates, [name]: 0 });
        setNewName("");
    };

    const handleRemove = (name: string) => {
        const next = { ...rates };
        delete next[name];
        onChange(next);
    };

    const handleRateChange = (name: string, value: string) => {
        onChange({ ...rates, [name]: Number(value) || 0 });
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
            <div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="text-xs text-slate-500">{hint}</p>
            </div>

            {entries.length > 0 && (
                <div className="space-y-2">
                    {entries.map(([name, rate]) => (
                        <div key={name} className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-slate-700">{name}</span>
                            <Input
                                type="number"
                                step="0.01"
                                value={rate}
                                onChange={(e) => handleRateChange(name, e.target.value)}
                                className="w-32"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(name)}
                                className="text-slate-400 hover:text-red-500"
                                title="Remove"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <Input
                    placeholder={placeholder}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
                    className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
            </div>
        </div>
    );
}

export default function RateCardForm({ initial }: RateCardFormProps) {
    const router = useRouter();
    const [data, setData] = useState<RateCardData>(initial);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/user/rate-card", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save");
            setMessage({ type: "success", text: "Rate card saved. New quotations will use these rates by default." });
            router.refresh();
        } catch {
            setMessage({ type: "error", text: "Could not save the rate card. Try again." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Aluminium Profile Rate</h3>
                <p className="text-xs text-slate-500">
                    A single ₹/ft rate applied to all aluminium members (frame, shutter, interlock, track rail, mullion). Override per-quotation if a specific job uses a different batch price.
                </p>
                <div className="max-w-xs">
                    <Label className="mb-1 text-xs">Rate per ft (₹)</Label>
                    <Input
                        type="number"
                        step="0.01"
                        value={data.profileRatePerFt}
                        onChange={(e) => setData({ ...data, profileRatePerFt: Number(e.target.value) || 0 })}
                    />
                </div>
            </div>

            <NamedRateList
                title="Glass Rates"
                hint="Add one entry per glass type/thickness you quote (₹ per sq.ft)."
                placeholder="e.g. Toughened 5mm"
                rates={data.glassRates}
                onChange={(glassRates) => setData({ ...data, glassRates })}
            />

            <NamedRateList
                title="Hardware / Accessory Rates"
                hint="Unit price per accessory (e.g. Track Cap, Interlock Clip, C-Channel, handles, locks)."
                placeholder="e.g. Track Cap"
                rates={data.hardwareRates}
                onChange={(hardwareRates) => setData({ ...data, hardwareRates })}
            />

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Defaults</h3>
                <p className="text-xs text-slate-500">Pre-filled on every new quotation — still editable per quotation.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <Label className="mb-1 text-xs">Labor (₹)</Label>
                        <Input type="number" step="0.01" value={data.laborDefault} onChange={(e) => setData({ ...data, laborDefault: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <Label className="mb-1 text-xs">Overhead (₹)</Label>
                        <Input type="number" step="0.01" value={data.overheadDefault} onChange={(e) => setData({ ...data, overheadDefault: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <Label className="mb-1 text-xs">Profit Margin (%)</Label>
                        <Input type="number" step="0.01" value={data.profitMarginDefault} onChange={(e) => setData({ ...data, profitMarginDefault: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <Label className="mb-1 text-xs">Tax Rate (%)</Label>
                        <Input type="number" step="0.01" value={data.taxRateDefault} onChange={(e) => setData({ ...data, taxRateDefault: Number(e.target.value) || 0 })} />
                    </div>
                </div>
            </div>

            {message && (
                <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>{message.text}</p>
            )}

            <Button onClick={handleSave} isLoading={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save Rate Card
            </Button>
        </div>
    );
}
