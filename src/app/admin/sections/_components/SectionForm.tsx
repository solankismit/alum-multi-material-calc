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
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import type { SectionWithConfigs } from "@/types";
import { uiStyles } from "@/lib/utils";

interface SectionFormProps {
    initialData?: SectionWithConfigs | null;
    isEdit?: boolean;
}

export default function SectionForm({ initialData, isEdit }: SectionFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(initialData?.name || "");
    const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

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
            separateMosquitoNet: false,
            differentFrameMaterials: false,
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
        }]);
    };

    const handleRemoveConfig = (index: number) => {
        setConfigurations(configurations.filter((_, i) => i !== index));
    };

    const handleConfigChange = (index: number, field: string, value: any) => {
        const newConfigs = [...configurations];
        newConfigs[index] = { ...newConfigs[index], [field]: value };
        setConfigurations(newConfigs);
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
            trackTypes,
            configs,
            configurations: configurations.map(c => ({
                ...c,
                shutterWidthDeduction: Number(c.shutterWidthDeduction),
                heightDeduction: Number(c.heightDeduction),
                threeTrackWidthAddition: Number(c.threeTrackWidthAddition),
                glassWidthDeduction: Number(c.glassWidthDeduction),
                glassHeightDeduction: Number(c.glassHeightDeduction),
                trackRailDeduction: Number(c.trackRailDeduction || 0),
                separateMosquitoNet: Boolean(c.separateMosquitoNet),
                differentFrameMaterials: Boolean(c.differentFrameMaterials),
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
                <div>
                    <Label className="mb-1">Section Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Domal 27mm" />
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

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="mb-1 text-xs">Shutter Width Deduction</Label>
                                    <Input type="number" value={config.shutterWidthDeduction} onChange={e => handleConfigChange(i, "shutterWidthDeduction", Number(e.target.value))} />
                                </div>
                                <div>
                                    <Label className="mb-1 text-xs">Height Deduction</Label>
                                    <Input type="number" value={config.heightDeduction} onChange={e => handleConfigChange(i, "heightDeduction", Number(e.target.value))} />
                                </div>
                                <div>
                                    <Label className="mb-1 text-xs">3-Track Width Addition</Label>
                                    <Input type="number" value={config.threeTrackWidthAddition} onChange={e => handleConfigChange(i, "threeTrackWidthAddition", Number(e.target.value))} />
                                </div>
                                <div>
                                    <Label className="mb-1 text-xs">Glass Width Deduction</Label>
                                    <Input type="number" value={config.glassWidthDeduction} onChange={e => handleConfigChange(i, "glassWidthDeduction", Number(e.target.value))} />
                                </div>
                                <div>
                                    <Label className="mb-1 text-xs">Glass Height Deduction</Label>
                                    <Input type="number" value={config.glassHeightDeduction} onChange={e => handleConfigChange(i, "glassHeightDeduction", Number(e.target.value))} />
                                </div>
                                <div>
                                    <Label className="mb-1 text-xs">Track Rail Deduction</Label>
                                    <Input type="number" value={config.trackRailDeduction || 0} onChange={e => handleConfigChange(i, "trackRailDeduction", Number(e.target.value))} />
                                </div>
                                <div className="flex flex-col gap-2 pt-6">
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                        <input type="checkbox" checked={config.separateMosquitoNet || false} onChange={e => handleConfigChange(i, "separateMosquitoNet", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                                        Separate Mosquito Net
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                        <input type="checkbox" checked={config.differentFrameMaterials || false} onChange={e => handleConfigChange(i, "differentFrameMaterials", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                                        Split Frame Materials
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
