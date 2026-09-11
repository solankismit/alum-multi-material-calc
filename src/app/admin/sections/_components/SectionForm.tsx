"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import { Plus, Trash2, Save, ArrowLeft, Wand2 } from "lucide-react";
import type { SectionWithConfigs } from "@/types";
import type { HardwareItemData } from "@/utils/hardwareCatalog";
import UnitToggle from "@/components/ui/UnitToggle";
import {
    parseLength,
    formatLength,
    isLossyInUnit,
    UNIT_LABELS,
    DEDUCTION_UNITS,
    DIMENSION_UNITS,
    type LengthUnit,
} from "@/utils/units";
import { uiStyles } from "@/lib/utils";

interface SectionFormProps {
    initialData?: SectionWithConfigs | null;
    isEdit?: boolean;
    /** Admin-managed hardware catalog, fetched server-side. Drives the
     * per-window count inputs on each configuration. */
    hardwareCatalog: HardwareItemData[];
}

/**
 * A deduction constant, entered in whichever unit suits. Stored as mm.
 *
 * Keeps a raw text buffer while focused so typing isn't reformatted underneath
 * the user — the dora units quantize to 3.175mm, so re-deriving the display
 * from the stored value on each keystroke would be actively hostile.
 */
function DeductionInput({
    label,
    unit,
    value,
    onChange,
}: {
    label: string;
    unit: LengthUnit;
    value: number;
    onChange: (mm: number) => void;
}) {
    const [raw, setRaw] = useState<string | null>(null);
    const displayed = raw ?? formatLength(value ?? 0, unit);
    const lossy = raw === null && unit !== "mm" && isLossyInUnit(value ?? 0, unit);

    return (
        <div>
            <Label className="mb-1 text-xs">
                {label} <span className="text-slate-400">({UNIT_LABELS[unit]})</span>
            </Label>
            <Input
                type={unit === "inDora" ? "text" : "number"}
                step={unit === "mm" ? "0.001" : "1"}
                value={displayed}
                onChange={(e) => {
                    setRaw(e.target.value);
                    const mm = parseLength(e.target.value, unit);
                    if (mm !== null) onChange(mm);
                }}
                onBlur={() => setRaw(null)}
            />
            {/* The stored value isn't a whole number of dora, so this display is
                rounded. Say so rather than letting a silent 0.5mm drift in. */}
            {lossy && (
                <p className="text-[10px] text-amber-600 mt-0.5">
                    Rounded for display — stored as {value}mm
                </p>
            )}
        </div>
    );
}

export default function SectionForm({ initialData, isEdit, hardwareCatalog }: SectionFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(initialData?.name || "");
    const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
    const [systemType, setSystemType] = useState((initialData as any)?.systemType || "sliding");

    // Configurations
    const [configurations, setConfigurations] = useState<any[]>(initialData?.configurations || [
        {
            trackType: "2-track",
            configuration: "all-glass",
            shutterWidthDeduction: 0,
            heightDeduction: 0,
            threeTrackWidthAddition: 0,
            glassWidthDeduction: 0,
            glassHeightDeduction: 0,
            trackRailDeduction: 0,
            outerFrameWidthDeduction: 0,
            outerFrameHeightDeduction: 0,
            mullionWidthDeduction: 0,
            mullionLengthDeduction: 0,
            separateMosquitoNet: false,
            differentFrameMaterials: false,
            hasTrackRail: true,
            hardwareCounts: {},
        }
    ]);



    const handleAddConfig = () => {
        setConfigurations([...configurations, {
            trackType: "3-track",
            configuration: "glass-mosquito",
            shutterWidthDeduction: 0,
            heightDeduction: 0,
            threeTrackWidthAddition: 0,
            glassWidthDeduction: 0,
            glassHeightDeduction: 0,
            trackRailDeduction: 0,
            separateMosquitoNet: false,
            differentFrameMaterials: false,
            hasTrackRail: true,
            hardwareCounts: {},
        }]);
        setExamples([...examples, {}]);
        setExamplesB([...examplesB, {}]);
        setShowSecondExample([...showSecondExample, false]);
        setDeductionUnits([...deductionUnits, "mm"]);
        setExampleUnits([...exampleUnits, "mm"]);
    };

    const handleRemoveConfig = (index: number) => {
        setConfigurations(configurations.filter((_, i) => i !== index));
        setExamples(examples.filter((_, i) => i !== index));
        setExamplesB(examplesB.filter((_, i) => i !== index));
        setShowSecondExample(showSecondExample.filter((_, i) => i !== index));
        setDeductionUnits(deductionUnits.filter((_, i) => i !== index));
        setExampleUnits(exampleUnits.filter((_, i) => i !== index));
    };

    const handleConfigChange = (index: number, field: string, value: any) => {
        const newConfigs = [...configurations];
        newConfigs[index] = { ...newConfigs[index], [field]: value };
        setConfigurations(newConfigs);
    };

    // Unit for the "derive from example" fields. Separate from the deduction
    // unit below because these are whole-window measurements, not sub-inch
    // corrections — feet make sense here and dora-only does not.
    const [exampleUnits, setExampleUnits] = useState<LengthUnit[]>(
        (initialData?.configurations || [{}]).map(() => "mm" as LengthUnit)
    );
    const setExampleUnit = (index: number, unit: LengthUnit) => {
        const next = [...exampleUnits];
        next[index] = unit;
        setExampleUnits(next);
    };

    // Display unit for each configuration's deduction fields, per card. Not
    // persisted: the values themselves are always mm.
    const [deductionUnits, setDeductionUnits] = useState<LengthUnit[]>(
        (initialData?.configurations || [{}]).map(() => "mm" as LengthUnit)
    );
    const setDeductionUnit = (index: number, unit: LengthUnit) => {
        const next = [...deductionUnits];
        next[index] = unit;
        setDeductionUnits(next);
    };

    /** Writes one hardware item's per-window count. A zero is removed rather
     * than stored, so `hardwareCounts` only ever lists hardware this window
     * actually uses — which is what the pricing layer treats as meaningful. */
    const handleHardwareCountChange = (index: number, key: string, value: number) => {
        const newConfigs = [...configurations];
        const counts = { ...(newConfigs[index].hardwareCounts || {}) };
        if (!value || value <= 0) {
            delete counts[key];
        } else {
            counts[key] = value;
        }
        newConfigs[index] = { ...newConfigs[index], hardwareCounts: counts };
        setConfigurations(newConfigs);
    };

    // "Derive from example" — enter a real sample window and the measured
    // result (shutter/glass size), and the deduction constants are back-solved
    // from the same formulas the calculator already uses. Never guesses at
    // new physics: it only inverts sectionConfig.ts's existing equations.
    const [examples, setExamples] = useState<Record<string, string>[]>(
        (initialData?.configurations || [{}]).map(() => ({}))
    );
    // Second example — only needed for Openable profiles with 2+ panels, to
    // solve outerFrameWidthDeduction and mullionWidthDeduction jointly (one
    // example alone is one equation with two unknowns; see handleDerive).
    const [examplesB, setExamplesB] = useState<Record<string, string>[]>(
        (initialData?.configurations || [{}]).map(() => ({}))
    );
    const [showSecondExample, setShowSecondExample] = useState<boolean[]>(
        (initialData?.configurations || [{}]).map(() => false)
    );

    const handleExampleChange = (index: number, field: string, value: string) => {
        const newExamples = [...examples];
        newExamples[index] = { ...newExamples[index], [field]: value };
        setExamples(newExamples);
    };

    const handleExampleBChange = (index: number, field: string, value: string) => {
        const newExamples = [...examplesB];
        newExamples[index] = { ...newExamples[index], [field]: value };
        setExamplesB(newExamples);
    };

    const toggleSecondExample = (index: number) => {
        const next = [...showSecondExample];
        next[index] = !next[index];
        setShowSecondExample(next);
    };

    const round = (n: number) => Math.round(n * 1000) / 1000;

    // After deriving, recompute forward through the same formulas using ONLY
    // the newly stored constants + the sample size — independent of the typed
    // "resulting" values — and show the prediction next to what was typed.
    // If they match, the round-trip (invert → save → forward) is provably
    // consistent, not just assumed.
    type VerifyLine = { label: string; expected: number; predicted: number };
    const [verifyResults, setVerifyResults] = useState<Record<number, VerifyLine[]>>({});
    // Fields left blank during derive silently keep their deduction at 0 (or
    // whatever it was before) — flag these so a skipped field doesn't read as
    // "verified" when it was never actually checked.
    const [deriveWarnings, setDeriveWarnings] = useState<Record<number, string[]>>({});

    const handleDerive = (index: number) => {
        const ex = examples[index] || {};
        const exB = examplesB[index] || {};
        const config = configurations[index];
        // Parsed straight to mm, so every equation below — and the deduction
        // values they produce — stays in mm regardless of what was typed.
        const exampleUnit = exampleUnits[index] ?? "mm";
        const num = (v: string | undefined) => {
            if (v === "" || v === undefined) return NaN;
            const mm = parseLength(v, exampleUnit);
            return mm === null ? NaN : mm;
        };
        // Panel counts are plain integers, never a length.
        const count = (v: string | undefined) => (v === "" || v === undefined ? NaN : Number(v));

        const sampleW = num(ex.sampleWidth);
        const sampleH = num(ex.sampleHeight);
        const shutterW = num(ex.resultShutterWidth);
        const shutterH = num(ex.resultShutterHeight);
        const glassW = num(ex.resultGlassWidth);
        const glassH = num(ex.resultGlassHeight);

        if (isNaN(sampleW) || isNaN(sampleH) || isNaN(shutterW) || isNaN(shutterH)) {
            alert("Fill in the sample window size and the resulting shutter size at minimum.");
            return;
        }

        const updates: Record<string, number> = {};

        if (systemType === "sliding") {
            if (config.trackType === "3-track" && config.configuration === "all-glass") {
                updates.threeTrackWidthAddition = round(3 * shutterW - sampleW);
            } else {
                updates.shutterWidthDeduction = round(sampleW / 2 - shutterW);
            }
            updates.heightDeduction = round(sampleH - shutterH);

            const trackRailLen = num(ex.resultTrackRailLength);
            if (!isNaN(trackRailLen)) {
                updates.trackRailDeduction = round(sampleW - trackRailLen);
            }
        } else {
            const n1 = Math.max(1, count(ex.panels) || 1);
            updates.outerFrameHeightDeduction = round(sampleH - shutterH);

            const n2 = Math.max(1, count(exB.panels) || 1);
            const sampleWB = num(exB.sampleWidth);
            const shutterWB = num(exB.resultShutterWidth);
            const secondExampleUsable =
                showSecondExample[index] && !isNaN(sampleWB) && !isNaN(shutterWB) && n2 !== n1;

            if (secondExampleUsable) {
                // Two examples, two unknowns — solved exactly, not assumed.
                const remainderA = sampleW - n1 * shutterW; // = outer + (n1-1)*mullion
                const remainderB = sampleWB - n2 * shutterWB; // = outer + (n2-1)*mullion
                const mullionWidthDeduction = round((remainderA - remainderB) / (n1 - n2));
                updates.mullionWidthDeduction = mullionWidthDeduction;
                updates.outerFrameWidthDeduction = round(remainderA - (n1 - 1) * mullionWidthDeduction);
            } else {
                if (n1 > 1) {
                    alert(
                        "This example alone can't solve Mullion Width Deduction (one equation, two unknowns). " +
                        "Outer Frame Width Deduction below was computed assuming the current Mullion Width Deduction value is correct — " +
                        "add a second example with a different panel count to solve both exactly."
                    );
                }
                const mullionWidthDeduction = Number(config.mullionWidthDeduction) || 0;
                updates.outerFrameWidthDeduction = round(
                    sampleW - n1 * shutterW - (n1 - 1) * mullionWidthDeduction
                );
            }

            // Mullion piece length is independent of panel count — solvable from
            // either example alone, given the mullion's actual cut length.
            const mullionLenA = num(ex.resultMullionLength);
            const mullionLenB = num(exB.resultMullionLength);
            if (!isNaN(mullionLenA)) {
                updates.mullionLengthDeduction = round(sampleH - mullionLenA);
            } else if (!isNaN(mullionLenB) && !isNaN(sampleH)) {
                const sampleHB = num(exB.sampleHeight);
                if (!isNaN(sampleHB)) updates.mullionLengthDeduction = round(sampleHB - mullionLenB);
            }
        }

        if (!isNaN(glassW)) updates.glassWidthDeduction = round(shutterW - glassW);
        if (!isNaN(glassH)) updates.glassHeightDeduction = round(shutterH - glassH);

        // Flag any measurement that was left blank — its deduction was NOT
        // recomputed and stays at whatever it was before (0 for a new config),
        // which silently produces an oversized/incorrect result downstream.
        const warnings: string[] = [];
        if (isNaN(glassW)) warnings.push("Resulting Glass Width was left blank — Glass Width Deduction was NOT updated and glass size will be wrong until you enter it.");
        if (isNaN(glassH)) warnings.push("Resulting Glass Height was left blank — Glass Height Deduction was NOT updated and glass size will be wrong until you enter it.");
        if (systemType === "sliding") {
            const trackRailLenCheck = num(ex.resultTrackRailLength);
            if (isNaN(trackRailLenCheck) && (config.hasTrackRail ?? true)) {
                warnings.push("Resulting Track Rail Length was left blank — Track Rail Deduction was NOT updated (this section has a track rail).");
            }
        } else {
            const n1Check = Math.max(1, count(ex.panels) || 1);
            if (n1Check > 1) {
                const mullionLenACheck = num(ex.resultMullionLength);
                const mullionLenBCheck = num(exB.resultMullionLength);
                if (isNaN(mullionLenACheck) && isNaN(mullionLenBCheck)) {
                    warnings.push("Resulting Mullion Piece Length was left blank — Mullion Length Deduction was NOT updated.");
                }
            }
        }
        setDeriveWarnings(prev => ({ ...prev, [index]: warnings }));

        const newConfigs = [...configurations];
        newConfigs[index] = { ...newConfigs[index], ...updates };
        setConfigurations(newConfigs);

        // Build the verification: forward-calculate from the sample size using
        // only the just-derived constants, and compare against what was typed.
        const final = { ...config, ...updates };
        const lines: VerifyLine[] = [];

        if (systemType === "sliding") {
            const predShutterW =
                config.trackType === "3-track" && config.configuration === "all-glass"
                    ? (sampleW + final.threeTrackWidthAddition) / 3
                    : sampleW / 2 - final.shutterWidthDeduction;
            const predShutterH = sampleH - final.heightDeduction;
            lines.push({ label: "Shutter Width", expected: shutterW, predicted: round(predShutterW) });
            lines.push({ label: "Shutter Height", expected: shutterH, predicted: round(predShutterH) });

            if (!isNaN(glassW)) lines.push({ label: "Glass Width", expected: glassW, predicted: round(predShutterW - final.glassWidthDeduction) });
            if (!isNaN(glassH)) lines.push({ label: "Glass Height", expected: glassH, predicted: round(predShutterH - final.glassHeightDeduction) });

            const trackRailLen = num(ex.resultTrackRailLength);
            if (!isNaN(trackRailLen)) lines.push({ label: "Track Rail Length", expected: trackRailLen, predicted: round(sampleW - final.trackRailDeduction) });
        } else {
            const n1 = Math.max(1, count(ex.panels) || 1);
            const finalMullion = Number(final.mullionWidthDeduction) || 0;
            const predShutterW = (sampleW - final.outerFrameWidthDeduction - (n1 - 1) * finalMullion) / n1;
            const predShutterH = sampleH - final.outerFrameHeightDeduction;
            lines.push({ label: "Shutter Width (example A)", expected: shutterW, predicted: round(predShutterW) });
            lines.push({ label: "Shutter Height (example A)", expected: shutterH, predicted: round(predShutterH) });

            if (!isNaN(glassW)) lines.push({ label: "Glass Width", expected: glassW, predicted: round(predShutterW - final.glassWidthDeduction) });
            if (!isNaN(glassH)) lines.push({ label: "Glass Height", expected: glassH, predicted: round(predShutterH - final.glassHeightDeduction) });

            const n2 = Math.max(1, count(exB.panels) || 1);
            const shutterWB = num(exB.resultShutterWidth);
            if (showSecondExample[index] && !isNaN(shutterWB) && n2 !== n1) {
                const sampleWB = num(exB.sampleWidth);
                const predShutterWB = (sampleWB - final.outerFrameWidthDeduction - (n2 - 1) * finalMullion) / n2;
                lines.push({ label: "Shutter Width (example B)", expected: shutterWB, predicted: round(predShutterWB) });
            }

            const mullionLenA = num(ex.resultMullionLength);
            const mullionLenB = num(exB.resultMullionLength);
            if (!isNaN(mullionLenA)) {
                lines.push({ label: "Mullion Piece Length", expected: mullionLenA, predicted: round(sampleH - final.mullionLengthDeduction) });
            } else if (!isNaN(mullionLenB)) {
                const sampleHB = num(exB.sampleHeight);
                if (!isNaN(sampleHB)) lines.push({ label: "Mullion Piece Length (example B)", expected: mullionLenB, predicted: round(sampleHB - final.mullionLengthDeduction) });
            }
        }

        setVerifyResults(prev => ({ ...prev, [index]: lines }));
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Derive trackTypes and configs from configurations
        const trackTypes = Array.from(new Set(configurations.map(c => c.trackType)));
        const configs = Array.from(new Set(configurations.map(c => c.configuration)));

        const payload = {
            name,
            isActive,
            systemType,
            trackTypes,
            configs,
            configurations: configurations.map(c => ({
                ...c,
                shutterWidthDeduction: Number(c.shutterWidthDeduction),
                heightDeduction: Number(c.heightDeduction),
                threeTrackWidthAddition: Number(c.threeTrackWidthAddition),
                glassWidthDeduction: Number(c.glassWidthDeduction),
                glassHeightDeduction: Number(c.glassHeightDeduction),
                outerFrameWidthDeduction: c.outerFrameWidthDeduction ? Number(c.outerFrameWidthDeduction) : null,
                outerFrameHeightDeduction: c.outerFrameHeightDeduction ? Number(c.outerFrameHeightDeduction) : null,
                mullionWidthDeduction: c.mullionWidthDeduction ? Number(c.mullionWidthDeduction) : null,
                mullionLengthDeduction: c.mullionLengthDeduction ? Number(c.mullionLengthDeduction) : null,
                trackRailDeduction: Number(c.trackRailDeduction || 0),
                separateMosquitoNet: Boolean(c.separateMosquitoNet),
                differentFrameMaterials: Boolean(c.differentFrameMaterials),
                hasTrackRail: Boolean(c.hasTrackRail ?? true),
                hardwareCounts: c.hardwareCounts || {},
            })),

        };

        try {
            const url = isEdit ? `/api/admin/sections/${initialData?.id}` : "/api/admin/sections";
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save");
            }

            router.push("/admin/sections");
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Error saving section");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" type="button" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium mr-4">
                        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4" />
                        Active
                    </label>
                    <Button type="submit" isLoading={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {isEdit ? "Update Section" : "Create Section"}
                    </Button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h3 className="text-lg font-semibold">Basic Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="mb-1">Section Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Domal 27mm" />
                    </div>
                    <div>
                        <Label className="mb-1">System Class</Label>
                        <Select value={systemType} onValueChange={setSystemType}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select system class..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sliding">Sliding Window</SelectItem>
                                <SelectItem value="openable">Openable Window</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>



            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Formulas & Configurations</h3>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddConfig}>
                        <Plus className="w-4 h-4 mr-2" /> Add Config
                    </Button>
                </div>
                <div className="space-y-6">
                    {configurations.map((config, i) => (
                        <div key={i} className={`${uiStyles.card} p-4 bg-slate-50 space-y-4`}>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                <h4 className="text-sm font-semibold text-slate-700">Configuration {i + 1}</h4>
                                <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveConfig(i)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1 text-xs text-slate-600">Track Type</Label>
                                    <Select
                                        value={config.trackType}
                                        onValueChange={val => handleConfigChange(i, "trackType", val)}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select track..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2-track">2-track</SelectItem>
                                            <SelectItem value="3-track">3-track</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-1 text-xs text-slate-600">Configuration</Label>
                                    <Select
                                        value={config.configuration}
                                        onValueChange={val => handleConfigChange(i, "configuration", val)}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select config..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all-glass">all-glass</SelectItem>
                                            <SelectItem value="glass-mosquito">glass-mosquito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
                                        <Wand2 className="w-3.5 h-3.5" />
                                        Derive from example (optional) — enter a real window and its measured result, the deductions below get filled in for you
                                    </div>
                                    {/* Whole-window measurements, so these are the dimension
                                        units. Everything is parsed to mm before solving, so the
                                        derived deductions come out in mm whatever is typed. */}
                                    <UnitToggle
                                        unitMode={exampleUnits[i] ?? "mm"}
                                        onChange={(u) => setExampleUnit(i, u)}
                                        units={DIMENSION_UNITS}
                                        compact
                                        label="Entered in"
                                    />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <Label className="mb-1 text-[11px] text-slate-600">Sample Window Width</Label>
                                        <Input type="number" placeholder="e.g. 2382" value={examples[i]?.sampleWidth ?? ""} onChange={e => handleExampleChange(i, "sampleWidth", e.target.value)} className="bg-white" />
                                    </div>
                                    <div>
                                        <Label className="mb-1 text-[11px] text-slate-600">Sample Window Height</Label>
                                        <Input type="number" placeholder="e.g. 1428" value={examples[i]?.sampleHeight ?? ""} onChange={e => handleExampleChange(i, "sampleHeight", e.target.value)} className="bg-white" />
                                    </div>
                                    {systemType !== "sliding" && (
                                        <div>
                                            <Label className="mb-1 text-[11px] text-slate-600">Panels</Label>
                                            <Input type="number" min="1" placeholder="e.g. 2" value={examples[i]?.panels ?? ""} onChange={e => handleExampleChange(i, "panels", e.target.value)} className="bg-white" />
                                        </div>
                                    )}
                                    <div>
                                        <Label className="mb-1 text-[11px] text-slate-600">Resulting Shutter Width</Label>
                                        <Input type="number" placeholder="e.g. 1191" value={examples[i]?.resultShutterWidth ?? ""} onChange={e => handleExampleChange(i, "resultShutterWidth", e.target.value)} className="bg-white" />
                                    </div>
                                    <div>
                                        <Label className="mb-1 text-[11px] text-slate-600">Resulting Shutter Height</Label>
                                        <Input type="number" placeholder="e.g. 1360" value={examples[i]?.resultShutterHeight ?? ""} onChange={e => handleExampleChange(i, "resultShutterHeight", e.target.value)} className="bg-white" />
                                    </div>
                                    <div>
                                        <Label className="mb-1 text-[11px] text-slate-600">Resulting Glass Width</Label>
                                        <Input type="number" placeholder="e.g. 1084" value={examples[i]?.resultGlassWidth ?? ""} onChange={e => handleExampleChange(i, "resultGlassWidth", e.target.value)} className="bg-white" />
                                    </div>
                                    <div>
                                        <Label className="mb-1 text-[11px] text-slate-600">Resulting Glass Height</Label>
                                        <Input type="number" placeholder="e.g. 1256" value={examples[i]?.resultGlassHeight ?? ""} onChange={e => handleExampleChange(i, "resultGlassHeight", e.target.value)} className="bg-white" />
                                    </div>
                                    {systemType === "sliding" && (
                                        <div>
                                            <Label className="mb-1 text-[11px] text-slate-600">Resulting Track Rail Length (optional)</Label>
                                            <Input type="number" placeholder="e.g. 2332" value={examples[i]?.resultTrackRailLength ?? ""} onChange={e => handleExampleChange(i, "resultTrackRailLength", e.target.value)} className="bg-white" />
                                        </div>
                                    )}
                                    {systemType !== "sliding" && (Number(examples[i]?.panels) || 1) > 1 && (
                                        <div>
                                            <Label className="mb-1 text-[11px] text-slate-600">Resulting Mullion Piece Length (optional)</Label>
                                            <Input type="number" placeholder="e.g. 1474.6" value={examples[i]?.resultMullionLength ?? ""} onChange={e => handleExampleChange(i, "resultMullionLength", e.target.value)} className="bg-white" />
                                        </div>
                                    )}
                                </div>

                                {systemType !== "sliding" && (Number(examples[i]?.panels) || 1) > 1 && !showSecondExample[i] && (
                                    <div className="text-[11px] text-indigo-700 bg-indigo-100 rounded p-2">
                                        A single multi-panel example cannot separate Outer Frame Width Deduction from Mullion Width Deduction — it is one equation with two unknowns.{" "}
                                        <button type="button" className="underline font-semibold" onClick={() => toggleSecondExample(i)}>
                                            Add a second example (different panel count) to solve both exactly
                                        </button>
                                        , or leave this and Compute will assume the current Mullion Width Deduction value below is correct.
                                    </div>
                                )}

                                {showSecondExample[i] && (
                                    <div className="rounded-lg border border-indigo-300 bg-white p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-semibold text-indigo-900">Second example — use a different panel count than above</p>
                                            <button type="button" className="text-[11px] text-slate-500 underline" onClick={() => toggleSecondExample(i)}>Remove</button>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            <div>
                                                <Label className="mb-1 text-[11px] text-slate-600">Sample Window Width</Label>
                                                <Input type="number" placeholder="e.g. 3000" value={examplesB[i]?.sampleWidth ?? ""} onChange={e => handleExampleBChange(i, "sampleWidth", e.target.value)} />
                                            </div>
                                            <div>
                                                <Label className="mb-1 text-[11px] text-slate-600">Sample Window Height</Label>
                                                <Input type="number" placeholder="e.g. 1500" value={examplesB[i]?.sampleHeight ?? ""} onChange={e => handleExampleBChange(i, "sampleHeight", e.target.value)} />
                                            </div>
                                            <div>
                                                <Label className="mb-1 text-[11px] text-slate-600">Panels</Label>
                                                <Input type="number" min="1" placeholder="e.g. 3" value={examplesB[i]?.panels ?? ""} onChange={e => handleExampleBChange(i, "panels", e.target.value)} />
                                            </div>
                                            <div>
                                                <Label className="mb-1 text-[11px] text-slate-600">Resulting Shutter Width</Label>
                                                <Input type="number" placeholder="e.g. 961.9" value={examplesB[i]?.resultShutterWidth ?? ""} onChange={e => handleExampleBChange(i, "resultShutterWidth", e.target.value)} />
                                            </div>
                                            <div>
                                                <Label className="mb-1 text-[11px] text-slate-600">Resulting Mullion Piece Length (optional)</Label>
                                                <Input type="number" placeholder="e.g. 1474.6" value={examplesB[i]?.resultMullionLength ?? ""} onChange={e => handleExampleBChange(i, "resultMullionLength", e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button type="button" size="sm" variant="secondary" onClick={() => handleDerive(i)}>
                                    <Wand2 className="w-3.5 h-3.5 mr-2" />
                                    Compute deductions from this example
                                </Button>

                                {deriveWarnings[i] && deriveWarnings[i].length > 0 && (
                                    <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs space-y-1">
                                        <p className="font-semibold text-red-800">⚠ Not computed — fields left blank</p>
                                        {deriveWarnings[i].map((w, wi) => (
                                            <p key={wi} className="text-red-700">{w}</p>
                                        ))}
                                    </div>
                                )}

                                {verifyResults[i] && verifyResults[i].length > 0 && (() => {
                                    const allOk = verifyResults[i].every(l => Math.abs(l.expected - l.predicted) < 0.01);
                                    return (
                                        <div className={`rounded-lg border p-3 text-xs ${allOk ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
                                            <p className={`font-semibold mb-1.5 ${allOk ? "text-green-800" : "text-amber-800"}`}>
                                                {allOk ? "✓ Verified — the saved deductions reproduce this example exactly" : "⚠ Mismatch — check the values below"}
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                                {verifyResults[i].map((l, li) => {
                                                    // Both sides are mm; shown back in the entry unit.
                                                    const ok = Math.abs(l.expected - l.predicted) < 0.01;
                                                    const u = exampleUnits[i] ?? "mm";
                                                    return (
                                                        <div key={li} className={ok ? "text-green-700" : "text-amber-700"}>
                                                            {l.label}: {formatLength(l.predicted, u)}{UNIT_LABELS[u]}
                                                            {!ok && ` (typed ${formatLength(l.expected, u)}${UNIT_LABELS[u]})`}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="flex items-center justify-between pb-1">
                                <p className="text-xs font-medium text-slate-600">Deductions</p>
                                {/* These are sub-inch corrections, and the real values are exact
                                    dora multiples (3.175 = 1 dora, 66.675 = 21, 104.775 = 33) —
                                    so dora is their natural unit. Stored as mm either way. */}
                                <UnitToggle
                                    unitMode={deductionUnits[i] ?? "mm"}
                                    onChange={(u) => setDeductionUnit(i, u)}
                                    units={DEDUCTION_UNITS}
                                    compact
                                    label="Shown in"
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {systemType === "sliding" ? (
                                    <>
                                        <DeductionInput label="Shutter Width Deduction" unit={deductionUnits[i] ?? "mm"} value={config.shutterWidthDeduction} onChange={v => handleConfigChange(i, "shutterWidthDeduction", v)} />
                                        <DeductionInput label="Height Deduction" unit={deductionUnits[i] ?? "mm"} value={config.heightDeduction} onChange={v => handleConfigChange(i, "heightDeduction", v)} />
                                        <DeductionInput label="3-Track Width Addition" unit={deductionUnits[i] ?? "mm"} value={config.threeTrackWidthAddition} onChange={v => handleConfigChange(i, "threeTrackWidthAddition", v)} />
                                        <DeductionInput label="Track Rail Deduction" unit={deductionUnits[i] ?? "mm"} value={config.trackRailDeduction || 0} onChange={v => handleConfigChange(i, "trackRailDeduction", v)} />
                                    </>
                                ) : (
                                    <>
                                        <DeductionInput label="Outer Frame Width Deduction" unit={deductionUnits[i] ?? "mm"} value={config.outerFrameWidthDeduction || 0} onChange={v => handleConfigChange(i, "outerFrameWidthDeduction", v)} />
                                        <DeductionInput label="Outer Frame Height Deduction" unit={deductionUnits[i] ?? "mm"} value={config.outerFrameHeightDeduction || 0} onChange={v => handleConfigChange(i, "outerFrameHeightDeduction", v)} />
                                        <DeductionInput label="Mullion Width Deduction" unit={deductionUnits[i] ?? "mm"} value={config.mullionWidthDeduction || 0} onChange={v => handleConfigChange(i, "mullionWidthDeduction", v)} />
                                        <DeductionInput label="Mullion Length Deduction" unit={deductionUnits[i] ?? "mm"} value={config.mullionLengthDeduction || 0} onChange={v => handleConfigChange(i, "mullionLengthDeduction", v)} />
                                    </>
                                )}
                                <DeductionInput label="Glass Width Deduction" unit={deductionUnits[i] ?? "mm"} value={config.glassWidthDeduction} onChange={v => handleConfigChange(i, "glassWidthDeduction", v)} />
                                <DeductionInput label="Glass Height Deduction" unit={deductionUnits[i] ?? "mm"} value={config.glassHeightDeduction} onChange={v => handleConfigChange(i, "glassHeightDeduction", v)} />
                                {/* One count input per active hardware item. Adding an item in
                                    /admin/hardware appears here with no code change. */}
                                {hardwareCatalog.filter(h => h.isActive).map(item => (
                                    <div key={item.key}>
                                        <Label className="mb-1 text-xs">{item.label} (per window)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={config.hardwareCounts?.[item.key] ?? 0}
                                            onChange={e => handleHardwareCountChange(i, item.key, Number(e.target.value))}
                                        />
                                    </div>
                                ))}
                                <div className="flex flex-col gap-2 pt-6">
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                        <input type="checkbox" checked={config.separateMosquitoNet || false} onChange={e => handleConfigChange(i, "separateMosquitoNet", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                                        Separate Mosquito Net
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                        <input type="checkbox" checked={config.differentFrameMaterials || false} onChange={e => handleConfigChange(i, "differentFrameMaterials", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                                        Split Frame Materials
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                        <input type="checkbox" checked={config.hasTrackRail ?? true} onChange={e => handleConfigChange(i, "hasTrackRail", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                                        Include Track Rail
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </form>
    );
}
