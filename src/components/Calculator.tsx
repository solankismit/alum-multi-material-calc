"use client";

import { useState, useEffect, useCallback } from "react";
import { Calculator as CalculatorIcon, Save, Download } from "lucide-react";
import { SectionConfiguration } from "@prisma/client";
import { CalculationResult, WindowInput, StockOption } from "@/types";
import { calculateMaterials } from "@/utils/calculations";
import WindowForm from "@/lib/components/WindowForm";
import ResultsDisplay from "@/lib/components/ResultsDisplay";
import StockSettings from "@/components/StockSettings";
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
import { useRouter } from "next/navigation";

interface CalculatorProps {
    initialInput?: WindowInput;
    initialSectionId?: string;
}

export default function Calculator({ initialInput, initialSectionId }: CalculatorProps) {
    const router = useRouter();
    const [windowInput, setWindowInput] = useState<WindowInput | null>(
        initialInput || null
    );
    const [result, setResult] = useState<CalculationResult | null>(null);

    // Section Data State
    const [allSections, setAllSections] = useState<any[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [sectionConfigs, setSectionConfigs] = useState<SectionConfiguration[]>(
        []
    );

    // Stock Settings State
    const [availableStockOptions, setAvailableStockOptions] = useState<StockOption[]>([]);
    const [selectedStockOptions, setSelectedStockOptions] = useState<StockOption[]>([]);

    // Saving state
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [worksheetName, setWorksheetName] = useState("");

    // Fetch initial data
    useEffect(() => {
        fetch("/api/sections")
            .then((res) => res.json())
            .then((data) => {
                setAllSections(data);
                if (data.length > 0) {
                    // Select provided section if valid, otherwise first active section
                    if (initialSectionId && data.some((s: any) => s.id === initialSectionId)) {
                        setSelectedSectionId(initialSectionId);
                    } else {
                        setSelectedSectionId(data[0].id);
                    }
                }
            })
            .catch((err) => console.error("Failed to fetch section configs", err));
    }, [initialSectionId]);

    // Handle Section Selection Change
    useEffect(() => {
        if (!selectedSectionId || allSections.length === 0) return;

        const section = allSections.find((s) => s.id === selectedSectionId);
        if (!section) return;

        // 1. Update Configs
        setSectionConfigs(section.configurations);

        // 2. Update Stock Options
        // Extract unique stocks from THIS section only
        const uniqueStocks = new Map();
        if (section.stockLengths) {
            section.stockLengths.forEach((sl: any) => {
                // Use 'name' if available (from our new UI), else fallback to generated name
                const displayName = sl.name || `${sl.lengthFeet}ft`;
                if (!uniqueStocks.has(sl.length)) {
                    uniqueStocks.set(sl.length, {
                        length: sl.length,
                        lengthFeet: sl.lengthFeet,
                        name: displayName,
                        id: sl.id // efficient to keep ID if needed
                    });
                }
            });
        }

        // Sort desc by length
        const options = Array.from(uniqueStocks.values()).sort(
            (a: any, b: any) => b.length - a.length
        );

        setAvailableStockOptions(options);
        // Default select all
        if (options.length > 0) {
            setSelectedStockOptions(options);
        } else {
            setSelectedStockOptions([]);
        }

        // Reset result as basis changed
        setResult(null);

    }, [selectedSectionId, allSections]);


    const handleCalculate = useCallback(() => {
        if (
            windowInput &&
            sectionConfigs.length > 0 &&
            selectedStockOptions.length > 0
        ) {
            const calculationResult = calculateMaterials(
                windowInput,
                sectionConfigs,
                selectedStockOptions
            );
            setResult(calculationResult);
        } else if (selectedStockOptions.length === 0 && windowInput) {
            setResult(null);
        }
    }, [windowInput, sectionConfigs, selectedStockOptions]);

    // Auto-calculate when input changes (only if we have valid input)
    // We don't auto-calculate on section change (handled by effect clearing result)
    // unless input is present.
    useEffect(() => {
        if (windowInput) {
            handleCalculate();
        }
    }, [handleCalculate, windowInput]);
    // removed handleCalculate dependency loop by robust callback

    const handleSubmitInput = (input: WindowInput) => {
        setWindowInput(input);
    };

    const handleReset = () => {
        setWindowInput(null);
        setResult(null);
    };

    const handleSaveClick = () => {
        if (!result) return;
        setShowSaveDialog(true);
    };

    const performSave = async () => {
        if (!worksheetName.trim()) {
            alert("Please enter a name");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/worksheets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: worksheetName,
                    data: {
                        input: windowInput,
                        result: result,
                        sectionId: selectedSectionId
                    },
                }),
            });

            if (res.status === 401) {
                if (confirm("You need to be logged in to save. Go to login?")) {
                    router.push("/login");
                }
                return;
            }

            if (!res.ok) {
                throw new Error("Failed to save");
            }

            alert("Worksheet saved successfully!");
            setShowSaveDialog(false);
            router.push("/dashboard");
        } catch (error) {
            console.error("Save error", error);
            alert("Failed to save worksheet.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <header className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <CalculatorIcon className="w-10 h-10 text-slate-700" />
                        <h1 className="text-4xl font-bold text-slate-800">
                            Aluminium Window Stock Estimation
                        </h1>
                    </div>
                    <p className="text-slate-600 text-lg mb-6">
                        Calculate material requirements and optimize stock usage
                    </p>

                    {/* Section Selector */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white p-4 rounded-lg shadow-sm max-w-xl mx-auto border border-slate-100">
                        <Label className="text-base font-medium text-slate-700 whitespace-nowrap">
                            Select System:
                        </Label>
                        <div className="w-full sm:w-64">
                            <Select
                                value={selectedSectionId}
                                onValueChange={setSelectedSectionId}
                                disabled={allSections.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a system..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allSections.map((section) => (
                                        <SelectItem key={section.id} value={section.id}>
                                            {section.name}
                                        </SelectItem>
                                    ))}
                                    {allSections.length === 0 && (
                                        <div className="p-2 text-sm text-center text-gray-500">Loading...</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </header>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-1">
                        <WindowForm
                            onCalculate={handleSubmitInput}
                            onReset={handleReset}
                            initialValues={initialInput}
                        />
                    </div>

                    <div className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start space-y-4">
                        {/* Action Bar */}
                        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all duration-200">
                            <StockSettings
                                availableOptions={availableStockOptions}
                                selectedOptions={selectedStockOptions}
                                onSelectionChange={setSelectedStockOptions}
                            />

                            {result && (
                                <div className="flex items-center justify-end gap-2 flex-1">
                                    {showSaveDialog ? (
                                        <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-right-4 duration-300">
                                            <Input
                                                placeholder="Worksheet Name"
                                                value={worksheetName}
                                                onChange={(e) => setWorksheetName(e.target.value)}
                                                className="flex-1"
                                                autoFocus
                                            />
                                            <Button
                                                size="sm"
                                                onClick={performSave}
                                                isLoading={isSaving}
                                            >
                                                Confirm
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setShowSaveDialog(false)}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={handleSaveClick}
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                        >
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Worksheet
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {result && <ResultsDisplay result={result} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
