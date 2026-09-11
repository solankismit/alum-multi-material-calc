"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Plus, Trash2, Save } from "lucide-react";
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS } from "@/utils/materialCategory";
import { slugifyHardwareKey, type HardwareRateMap } from "@/utils/hardwareRates";
import type { HardwareItemData } from "@/utils/hardwareCatalog";
import UnitToggle from "@/components/ui/UnitToggle";
import { DIMENSION_UNITS, type LengthUnit } from "@/utils/units";

type LaborMode = "flat" | "percentOfMaterial" | "perSqft";

interface RateCardData {
    profileRateBasis: "weight" | "length";
    profileRatePerFt: number;
    profileRates: Record<string, number>;
    profileWeightPerFt: Record<string, number>;
    profileRatesPerKg: Record<string, number>;
    profileGroupCategories: string[];
    profileGroupLabel: string;
    profileGroupRatePerKg: number;
    glassRates: Record<string, number>;
    hardwareRates: HardwareRateMap;
    rubberRatePerSqft: number;
    brushRatePerSqft: number;
    coatingRatePerKg: number;
    coatingWastagePercent: number;
    laborMode: LaborMode;
    laborDefault: number;
    laborPercent: number;
    laborRatePerSqft: number;
    overheadDefault: number;
    profitMarginDefault: number;
    taxRateDefault: number;
    termsText: string;
    hsnCodes: Record<string, string>;
    displayLengthUnit: LengthUnit;
}

interface RateCardFormProps {
    initial: RateCardData;
    /** Admin-managed hardware catalog — each item gets a rate row here. */
    hardwareCatalog: HardwareItemData[];
}

const LABOR_MODES: { value: LaborMode; label: string }[] = [
    { value: "flat", label: "Flat Amount (₹)" },
    { value: "percentOfMaterial", label: "% of Material Cost" },
    { value: "perSqft", label: "₹ per Sq.Ft of Area" },
];

const PROFILE_BASES: { value: RateCardData["profileRateBasis"]; label: string }[] = [
    { value: "weight", label: "By Weight (₹/kg)" },
    { value: "length", label: "By Length (₹/ft)" },
];

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

/**
 * Hardware rates, in two tiers.
 *
 * Catalog items (managed by the admin in /admin/hardware) get a fixed row with
 * a read-only label — the label is the admin's, and editing it here would only
 * make the row look detached from the item it prices. Anything else in the map
 * is the user's own custom entry and keeps the original add/rename/remove
 * behaviour, so nothing that worked before this catalog existed stops working.
 */
function NamedKeyedRateList({
    title,
    hint,
    placeholder,
    rates,
    catalog,
    onChange,
}: {
    title: string;
    hint: string;
    placeholder: string;
    rates: HardwareRateMap;
    catalog: HardwareItemData[];
    onChange: (next: HardwareRateMap) => void;
}) {
    const [newLabel, setNewLabel] = useState("");

    const catalogKeys = new Set(catalog.map((i) => i.key));
    const activeCatalog = catalog.filter((i) => i.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    // A retired catalog item is still shown when the user has a rate for it,
    // so an inherited price never silently vanishes from this page.
    const retainedInactive = catalog.filter((i) => !i.isActive && rates[i.key]);
    const customEntries = Object.entries(rates).filter(([key]) => !catalogKeys.has(key));

    const handleAdd = () => {
        const label = newLabel.trim();
        if (!label) return;
        const baseKey = slugifyHardwareKey(label) || "hardware";
        let key = baseKey;
        let suffix = 2;
        while (key in rates) {
            key = `${baseKey}_${suffix}`;
            suffix++;
        }
        onChange({ ...rates, [key]: { label, rate: 0 } });
        setNewLabel("");
    };

    const handleRemove = (key: string) => {
        const next = { ...rates };
        delete next[key];
        onChange(next);
    };

    const handleLabelChange = (key: string, label: string) => {
        onChange({ ...rates, [key]: { ...rates[key], label } });
    };

    const handleRateChange = (key: string, label: string, value: string) => {
        onChange({ ...rates, [key]: { label, rate: Number(value) || 0 } });
    };

    const catalogRow = (item: HardwareItemData, muted: boolean) => (
        <div key={item.key} className="flex items-center gap-2">
            <span className={`flex-1 text-sm ${muted ? "text-slate-400" : "text-slate-700"}`}>
                {item.label}
                <span className="text-slate-400 text-xs"> (₹/{item.unit})</span>
                {muted && <span className="text-xs text-slate-400"> — retired</span>}
            </span>
            <Input
                type="number"
                step="0.01"
                value={rates[item.key]?.rate ?? ""}
                onChange={(e) => handleRateChange(item.key, item.label, e.target.value)}
                className="w-32"
            />
            {/* No remove button: the item belongs to the admin catalog, not to
                this rate card. Clearing the rate is the way to opt out. */}
            <span className="w-4" />
        </div>
    );

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
            <div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="text-xs text-slate-500">{hint}</p>
            </div>

            {(activeCatalog.length > 0 || retainedInactive.length > 0) && (
                <div className="space-y-2">
                    {activeCatalog.map((item) => catalogRow(item, false))}
                    {retainedInactive.map((item) => catalogRow(item, true))}
                </div>
            )}

            {customEntries.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-400">Your own items</p>
                    {customEntries.map(([key, entry]) => (
                        <div key={key} className="flex items-center gap-2">
                            <Input
                                value={entry.label}
                                onChange={(e) => handleLabelChange(key, e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                type="number"
                                step="0.01"
                                value={entry.rate}
                                onChange={(e) => handleRateChange(key, entry.label, e.target.value)}
                                className="w-32"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(key)}
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
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
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

function NamedTextList({
    title,
    hint,
    namePlaceholder,
    valuePlaceholder,
    values,
    onChange,
}: {
    title: string;
    hint: string;
    namePlaceholder: string;
    valuePlaceholder: string;
    values: Record<string, string>;
    onChange: (next: Record<string, string>) => void;
}) {
    const [newName, setNewName] = useState("");
    const entries = Object.entries(values);

    const handleAdd = () => {
        const name = newName.trim();
        if (!name || name in values) return;
        onChange({ ...values, [name]: "" });
        setNewName("");
    };

    const handleRemove = (name: string) => {
        const next = { ...values };
        delete next[name];
        onChange(next);
    };

    const handleValueChange = (name: string, value: string) => {
        onChange({ ...values, [name]: value });
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
            <div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="text-xs text-slate-500">{hint}</p>
            </div>

            {entries.length > 0 && (
                <div className="space-y-2">
                    {entries.map(([name, value]) => (
                        <div key={name} className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-slate-700">{name}</span>
                            <Input
                                value={value}
                                placeholder={valuePlaceholder}
                                onChange={(e) => handleValueChange(name, e.target.value)}
                                className="w-40"
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
                    placeholder={namePlaceholder}
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

export default function RateCardForm({ initial, hardwareCatalog }: RateCardFormProps) {
    const router = useRouter();
    const [data, setData] = useState<RateCardData>(initial);

    const hasAnyWeight = Object.values(data.profileWeightPerFt).some((kgPerFt) => kgPerFt > 0);
    const ungroupedCategories = MATERIAL_CATEGORIES.filter(
        (category) => !data.profileGroupCategories.includes(category)
    );
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
                <h3 className="font-semibold text-slate-800">Aluminium Profile Pricing</h3>
                <p className="text-xs text-slate-500">
                    Aluminium is normally bought by weight, so ₹/kg is the default. Either way
                    the quantity charged is the <strong>whole bars purchased</strong> (including
                    offcut scrap), not just the length of the finished pieces.
                </p>

                <div className="flex flex-wrap gap-2">
                    {PROFILE_BASES.map((b) => (
                        <button
                            key={b.value}
                            type="button"
                            onClick={() => setData({ ...data, profileRateBasis: b.value })}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${data.profileRateBasis === b.value
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            {b.label}
                        </button>
                    ))}
                </div>

                {data.profileRateBasis === "weight" ? (
                    <>
                        {/* Weight pricing multiplies footage by kg/ft, so a missing
                            weight silently prices that member at ₹0. Say so here
                            rather than letting a zero reach a quotation. */}
                        {!hasAnyWeight && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                                No profile weights are set below, so every profile would price at ₹0.
                                Enter kg/ft for each member you use before saving.
                            </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 space-y-3">
                            <div>
                                <h4 className="text-sm font-medium text-slate-700">Material group</h4>
                                <p className="text-xs text-slate-500">
                                    Members bought as one commodity at one ₹/kg. They appear on the
                                    quotation as a single line, expandable to the individual weights.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {MATERIAL_CATEGORIES.map((category) => (
                                    <label key={category} className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={data.profileGroupCategories.includes(category)}
                                            onChange={(e) => {
                                                const next = e.target.checked
                                                    ? [...data.profileGroupCategories, category]
                                                    : data.profileGroupCategories.filter((c) => c !== category);
                                                setData({ ...data, profileGroupCategories: next });
                                            }}
                                        />
                                        {MATERIAL_CATEGORY_LABELS[category]}
                                    </label>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3 max-w-md">
                                <div>
                                    <Label className="mb-1 text-xs">Group name (shown on the quote)</Label>
                                    <Input
                                        value={data.profileGroupLabel}
                                        onChange={(e) => setData({ ...data, profileGroupLabel: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1 text-xs">Group Rate (₹/kg)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={data.profileGroupRatePerKg}
                                        onChange={(e) => setData({ ...data, profileGroupRatePerKg: Number(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {ungroupedCategories.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                <div>
                                    <h4 className="text-sm font-medium text-slate-700">Priced separately</h4>
                                    <p className="text-xs text-slate-500">
                                        Members outside the group. Leave blank to use the group rate.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {ungroupedCategories.map((category) => (
                                        <div key={category}>
                                            <Label className="mb-1 text-xs">{MATERIAL_CATEGORY_LABELS[category]} (₹/kg)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder={`Group: ${data.profileGroupRatePerKg}`}
                                                value={data.profileRatesPerKg[category] ?? ""}
                                                onChange={(e) => {
                                                    const next = { ...data.profileRatesPerKg };
                                                    if (e.target.value === "") {
                                                        delete next[category];
                                                    } else {
                                                        next[category] = Number(e.target.value) || 0;
                                                    }
                                                    setData({ ...data, profileRatesPerKg: next });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-3">
                        <div className="max-w-xs">
                            <Label className="mb-1 text-xs">Default Rate — used for any category left blank (₹/ft)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={data.profileRatePerFt}
                                onChange={(e) => setData({ ...data, profileRatePerFt: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                            {MATERIAL_CATEGORIES.map((category) => (
                                <div key={category}>
                                    <Label className="mb-1 text-xs">{MATERIAL_CATEGORY_LABELS[category]} (₹/ft)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder={`Default: ${data.profileRatePerFt}`}
                                        value={data.profileRates[category] ?? ""}
                                        onChange={(e) => {
                                            const next = { ...data.profileRates };
                                            if (e.target.value === "") {
                                                delete next[category];
                                            } else {
                                                next[category] = Number(e.target.value) || 0;
                                            }
                                            setData({ ...data, profileRates: next });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Profile Weight</h3>
                <p className="text-xs text-slate-500">
                    Weight of one running foot. Drives coating cost always, and the profile cost
                    itself when pricing by weight. Example: a 16ft frame bar weighing 3.1kg is
                    3.1 ÷ 16 = 0.194 kg/ft.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {MATERIAL_CATEGORIES.map((category) => (
                        <div key={category}>
                            <Label className="mb-1 text-xs">{MATERIAL_CATEGORY_LABELS[category]} (kg/ft)</Label>
                            <Input
                                type="number"
                                step="0.001"
                                value={data.profileWeightPerFt[category] ?? ""}
                                onChange={(e) => {
                                    const next = { ...data.profileWeightPerFt };
                                    if (e.target.value === "") {
                                        delete next[category];
                                    } else {
                                        next[category] = Number(e.target.value) || 0;
                                    }
                                    setData({ ...data, profileWeightPerFt: next });
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Coating, Rubber & Brush</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <Label className="mb-1 text-xs">Coating Rate (₹/kg)</Label>
                        <Input type="number" step="0.01" value={data.coatingRatePerKg} onChange={(e) => setData({ ...data, coatingRatePerKg: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <Label className="mb-1 text-xs">Coating Wastage (%)</Label>
                        <Input type="number" step="0.01" value={data.coatingWastagePercent} onChange={(e) => setData({ ...data, coatingWastagePercent: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <Label className="mb-1 text-xs">Rubber Rate (₹/sq.ft)</Label>
                        <Input type="number" step="0.01" value={data.rubberRatePerSqft} onChange={(e) => setData({ ...data, rubberRatePerSqft: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <Label className="mb-1 text-xs">Brush Rate (₹/sq.ft)</Label>
                        <Input type="number" step="0.01" value={data.brushRatePerSqft} onChange={(e) => setData({ ...data, brushRatePerSqft: Number(e.target.value) || 0 })} />
                    </div>
                </div>
            </div>

            <NamedRateList
                title="Glass Rates"
                hint="Add one entry per glass type/thickness you quote (₹ per sq.ft)."
                placeholder="e.g. Toughened 5mm"
                rates={data.glassRates}
                onChange={(glassRates) => setData({ ...data, glassRates })}
            />

            <NamedKeyedRateList
                title="Hardware / Accessory Rates"
                hint="Your unit price for each hardware item. Per-window quantities are set on the section configuration, and are matched to these rates automatically — you no longer need to name anything a particular way. Add your own items below for anything not in the list."
                placeholder="e.g. Wool Pile"
                rates={data.hardwareRates}
                catalog={hardwareCatalog}
                onChange={(hardwareRates) => setData({ ...data, hardwareRates })}
            />

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Labor Costing</h3>
                <p className="text-xs text-slate-500">Choose how labor cost is calculated by default — still editable per quotation.</p>
                <div className="flex flex-wrap gap-2">
                    {LABOR_MODES.map((m) => (
                        <button
                            key={m.value}
                            type="button"
                            onClick={() => setData({ ...data, laborMode: m.value })}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${data.laborMode === m.value
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
                <div className="max-w-xs">
                    {data.laborMode === "flat" && (
                        <>
                            <Label className="mb-1 text-xs">Labor (₹)</Label>
                            <Input type="number" step="0.01" value={data.laborDefault} onChange={(e) => setData({ ...data, laborDefault: Number(e.target.value) || 0 })} />
                        </>
                    )}
                    {data.laborMode === "percentOfMaterial" && (
                        <>
                            <Label className="mb-1 text-xs">Labor (% of material cost)</Label>
                            <Input type="number" step="0.01" value={data.laborPercent} onChange={(e) => setData({ ...data, laborPercent: Number(e.target.value) || 0 })} />
                        </>
                    )}
                    {data.laborMode === "perSqft" && (
                        <>
                            <Label className="mb-1 text-xs">Labor (₹ per sq.ft)</Label>
                            <Input type="number" step="0.01" value={data.laborRatePerSqft} onChange={(e) => setData({ ...data, laborRatePerSqft: Number(e.target.value) || 0 })} />
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Defaults</h3>
                <p className="text-xs text-slate-500">Pre-filled on every new quotation — still editable per quotation.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

            <NamedTextList
                title="HSN Codes (for invoicing)"
                hint="One HSN code per item/category you sell — used to populate the dropdown on each invoice line. No default is guessed for you; check the correct code with your CA or GST filings."
                namePlaceholder="e.g. Aluminium Window Section"
                valuePlaceholder="HSN code"
                values={data.hsnCodes}
                onChange={(hsnCodes) => setData({ ...data, hsnCodes })}
            />

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Dimension Display Unit</h3>
                <p className="text-xs text-slate-500">
                    How window sizes are shown on quotations and printouts. Saved to your account
                    rather than your browser, so the same quotation prints identically wherever it
                    is opened. Entry forms keep their own unit picker. Areas are always sq.ft.
                </p>
                <UnitToggle
                    unitMode={data.displayLengthUnit}
                    onChange={(displayLengthUnit) => setData({ ...data, displayLengthUnit })}
                    units={DIMENSION_UNITS}
                    label=""
                />
                {data.displayLengthUnit === "inDora" && (
                    <p className="text-xs text-amber-600">
                        Inch-dora rounds to the nearest dora (3.175mm), so a size that isn&apos;t a
                        whole number of dora is shown rounded. The stored value is unchanged.
                    </p>
                )}
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h3 className="font-semibold text-slate-800">Terms & Conditions</h3>
                <p className="text-xs text-slate-500">Default text shown at the bottom of every printed quotation — editable per quotation before saving.</p>
                <textarea
                    value={data.termsText}
                    onChange={(e) => setData({ ...data, termsText: e.target.value })}
                    rows={4}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
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
