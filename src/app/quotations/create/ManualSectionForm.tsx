"use client";

import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import WindowSchematic from "@/components/WindowSchematic";
import { feetToMm, mmToFeet } from "@/utils/formatters";
import type { RateMap } from "./QuotationBuilder";

export interface ManualSection {
    id: string;
    name: string;
    trackType: "2-track" | "3-track";
    configuration: "all-glass" | "glass-mosquito";
    /** Stored in mm regardless of the unit toggle used to enter them. */
    height: number | null;
    width: number | null;
    quantity: number | null;
    glassType: string;
    glassRate: number;
    frameRatePerSqft: number;
}

export interface ManualHardwareItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    rate: number;
}

interface ManualSectionFormProps {
    section: ManualSection;
    unitMode: "mm" | "ft";
    glassRates: RateMap;
    canRemove: boolean;
    onUpdate: (updates: Partial<ManualSection>) => void;
    onRemove: () => void;
    hardwareItems: ManualHardwareItem[];
    onAddHardware: () => void;
    onUpdateHardware: (itemId: string, updates: Partial<ManualHardwareItem>) => void;
    onRemoveHardware: (itemId: string) => void;
}

/**
 * Editable card for one manual (no-worksheet) quotation section — dimensions,
 * track type/configuration, glass type/rate, a flat frame rate, and a live
 * diagram preview. Deliberately lighter than the Calculator's WindowForm:
 * no system-profile/stock-optimization dependency, one dimension per
 * section (add another section for a different size), and pricing is plain
 * area × rate — only what's needed to produce a quote line, not a cutting
 * plan.
 */
export default function ManualSectionForm({
    section,
    unitMode,
    glassRates,
    canRemove,
    onUpdate,
    onRemove,
    hardwareItems,
    onAddHardware,
    onUpdateHardware,
    onRemoveHardware,
}: ManualSectionFormProps) {
    const displayValue = (mm: number | null) => (mm === null ? "" : unitMode === "ft" ? mmToFeet(mm) : mm);

    const handleDimensionChange = (field: "height" | "width", value: string) => {
        if (value === "") {
            onUpdate({ [field]: null });
            return;
        }
        const num = Number(value);
        if (isNaN(num)) return;
        onUpdate({ [field]: unitMode === "ft" ? feetToMm(num) : num });
    };

    return (
        <div className="relative p-4 sm:p-6 bg-surface border border-border rounded-xl shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <Label className="text-xs mb-1">Section Name</Label>
                    <Input
                        value={section.name}
                        onChange={(e) => onUpdate({ name: e.target.value })}
                        placeholder="e.g. Living Room Window"
                    />
                </div>
                {canRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="text-text-muted hover:text-danger hover:bg-danger-surface mt-5"
                        aria-label="Remove section"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Track Type</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(["2-track", "3-track"] as const).map((tt) => (
                                <button
                                    key={tt}
                                    type="button"
                                    onClick={() => onUpdate({ trackType: tt })}
                                    className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${section.trackType === tt
                                        ? "bg-text text-surface border-text"
                                        : "bg-surface text-text-muted border-border hover:bg-surface-muted"
                                        }`}
                                >
                                    {tt === "2-track" ? "2-Track" : "3-Track"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Configuration</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(["all-glass", "glass-mosquito"] as const).map((cfg) => (
                                <button
                                    key={cfg}
                                    type="button"
                                    onClick={() => onUpdate({ configuration: cfg })}
                                    className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${section.configuration === cfg
                                        ? "bg-text text-surface border-text"
                                        : "bg-surface text-text-muted border-border hover:bg-surface-muted"
                                        }`}
                                >
                                    {cfg === "all-glass" ? "All Glass" : "Glass + Mosquito"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label className="text-xs">Height ({unitMode})</Label>
                            <Input
                                type="number"
                                value={displayValue(section.height)}
                                onChange={(e) => handleDimensionChange("height", e.target.value)}
                                placeholder="Height"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Width ({unitMode})</Label>
                            <Input
                                type="number"
                                value={displayValue(section.width)}
                                onChange={(e) => handleDimensionChange("width", e.target.value)}
                                placeholder="Width"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Qty</Label>
                            <Input
                                type="number"
                                min="1"
                                value={section.quantity === null ? "" : section.quantity}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    onUpdate({ quantity: value === "" ? null : Number(value) || 0 });
                                }}
                                placeholder="Qty"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Glass Type</Label>
                            {Object.keys(glassRates).length > 0 ? (
                                <Select
                                    value={section.glassType}
                                    onValueChange={(val) => onUpdate({ glassType: val, glassRate: glassRates[val] || 0 })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select glass..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(glassRates).map((name) => (
                                            <SelectItem key={name} value={name}>{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input value={section.glassType} onChange={(e) => onUpdate({ glassType: e.target.value })} placeholder="Glass name" />
                            )}
                        </div>
                        <div>
                            <Label className="text-xs">Glass Rate (₹/sq.ft)</Label>
                            <Input
                                type="number"
                                value={section.glassRate || ""}
                                onChange={(e) => onUpdate({ glassRate: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs">Frame & Fabrication Rate (₹/sq.ft)</Label>
                        <Input
                            type="number"
                            value={section.frameRatePerSqft || ""}
                            onChange={(e) => onUpdate({ frameRatePerSqft: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                <div className="flex flex-col space-y-2">
                    <Label className="text-xs">Visualization</Label>
                    <div className="flex-1 bg-surface-muted rounded-lg border border-border flex items-center justify-center p-4">
                        <WindowSchematic
                            trackType={section.trackType}
                            configuration={section.configuration}
                            widthMm={section.width ?? undefined}
                            heightMm={section.height ?? undefined}
                            className="max-h-[200px]"
                        />
                    </div>
                </div>
            </div>

            {/* Extra hardware (locks, handles, rollers) */}
            <div className="space-y-1 pt-2 border-t border-border">
                <Label className="text-xs">Hardware / Accessories (optional)</Label>
                {hardwareItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-1 items-center">
                        <div className="col-span-5">
                            <Input
                                placeholder="Hardware name"
                                className="h-8 text-xs"
                                value={item.name}
                                onChange={(e) => onUpdateHardware(item.id, { name: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <Input
                                type="number"
                                placeholder="Qty"
                                className="h-8 text-xs"
                                value={item.quantity || ""}
                                onChange={(e) => onUpdateHardware(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="col-span-2">
                            <Input
                                placeholder="Unit"
                                className="h-8 text-xs"
                                value={item.unit}
                                onChange={(e) => onUpdateHardware(item.id, { unit: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <Input
                                type="number"
                                placeholder="Rate"
                                className="h-8 text-xs"
                                value={item.rate || ""}
                                onChange={(e) => onUpdateHardware(item.id, { rate: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <button type="button" onClick={() => onRemoveHardware(item.id)} className="col-span-1 text-text-muted hover:text-danger">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                <button type="button" onClick={onAddHardware} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add hardware
                </button>
            </div>
        </div>
    );
}
