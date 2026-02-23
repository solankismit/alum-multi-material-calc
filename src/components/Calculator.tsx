"use client";

import { useState, useEffect, useCallback } from "react";
import { Calculator as CalculatorIcon, Save, Download } from "lucide-react";
import { SectionConfiguration } from "@prisma/client";
import { CalculationResult, WindowInput, StockOption, MaterialStockMap } from "@/types";
import { calculateMaterials } from "@/utils/calculations";
import WindowForm from "@/lib/components/WindowForm";
import ResultsDisplay from "@/lib/components/ResultsDisplay";

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
}

export default function Calculator({ initialInput }: CalculatorProps) {
    const router = useRouter();
    const [windowInput, setWindowInput] = useState<WindowInput | null>(
        initialInput || null
    );
    const [result, setResult] = useState<CalculationResult | null>(null);

    // Section Data State
    const [allSections, setAllSections] = useState<any[]>([]);


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
            })
            .catch((err) => console.error("Failed to fetch section configs", err));
    }, []);



    const handleCalculate = useCallback(() => {
        if (windowInput) {
            const calculationResult = calculateMaterials(
                windowInput,
                allSections
            );
            setResult(calculationResult);
        } else {
            setResult(null);
        }
    }, [windowInput, allSections]);

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
                        result: result
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
        <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <header className="mb-6 border-b border-slate-200 pb-4">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Material Calculator
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Optimize stock usage and estimate requirements for your project.
                    </p>
                </header>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-1">
                        <WindowForm
                            onCalculate={handleSubmitInput}
                            onReset={handleReset}
                            initialValues={initialInput}
                            allSections={allSections}
                        />
                    </div>

                    {result && <div className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start space-y-4">
                        {/* Action Bar */}
                        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all duration-200">
                            {result && (
                                <div className="flex items-center justify-end gap-2 flex-1 w-full relative">
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

                        {result && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ResultsDisplay result={result} />
                            </div>
                        )}
                    </div>}
                </div>
            </div>
        </div>
    );
}
