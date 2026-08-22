"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Calculator as CalculatorIcon } from "lucide-react";
import { CalculationResult, SectionWithConfigs, WindowInput } from "@/types";
import { calculateMaterials } from "@/utils/calculations";
import WindowForm from "@/lib/components/WindowForm";
import ResultsDisplay from "@/lib/components/ResultsDisplay";
import { PageContainer } from "@/components/layout/PageContainer";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton, LoadingStatus } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface CalculatorProps {
    initialInput?: WindowInput;
}

export default function Calculator({ initialInput }: CalculatorProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [windowInput, setWindowInput] = useState<WindowInput | null>(
        initialInput || null
    );
    const [result, setResult] = useState<CalculationResult | null>(null);

    // Section Data State
    const [allSections, setAllSections] = useState<SectionWithConfigs[]>([]);
    const [sectionsLoading, setSectionsLoading] = useState(true);


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
            .catch((err) => console.error("Failed to fetch section configs", err))
            .finally(() => setSectionsLoading(false));
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
            toast("Please enter a name", "error");
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
                toast("You need to be logged in to save.", "error");
                router.push("/login");
                return;
            }

            if (!res.ok) {
                throw new Error("Failed to save");
            }

            toast("Worksheet saved successfully!");
            setShowSaveDialog(false);
            router.push("/dashboard");
        } catch (error) {
            console.error("Save error", error);
            toast("Failed to save worksheet.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageContainer size="wide">
            <header className="mb-6 border-b border-border pb-4">
                <h1 className="text-2xl font-bold text-text tracking-tight">
                    Material Calculator
                </h1>
                <p className="text-text-muted text-sm mt-1">
                    Optimize stock usage and estimate requirements for your project.
                </p>
            </header>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="lg:col-span-1">
                    {sectionsLoading ? (
                        <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
                            <LoadingStatus label="Loading window systems" />
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-40 w-full rounded-lg" />
                            <Skeleton className="h-40 w-full rounded-lg" />
                        </div>
                    ) : (
                        <WindowForm
                            onCalculate={handleSubmitInput}
                            onReset={handleReset}
                            initialValues={initialInput}
                            allSections={allSections}
                        />
                    )}
                </div>

                {/* Right column's grid space is always reserved (not just once a
                    result exists) so the layout doesn't jump from 1 to 2 columns
                    on first calculate. */}
                <div className="lg:col-span-1 lg:sticky lg:top-20 lg:self-start space-y-4">
                    {result ? (
                        <>
                            <div className="bg-surface p-4 rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all duration-200">
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
                            </div>

                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ResultsDisplay result={result} />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 lg:gap-3 rounded-xl border border-dashed border-border bg-surface/50 p-6 lg:p-12 text-center h-full lg:min-h-[300px]">
                            <CalculatorIcon className="h-6 w-6 lg:h-8 lg:w-8 text-text-muted" />
                            <p className="text-sm text-text-muted max-w-xs">
                                Fill in the window specifications and calculate to see material
                                requirements here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
