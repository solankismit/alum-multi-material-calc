"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutList, Scissors, List } from "lucide-react";
import { CalculationResult, WindowInput } from "@/types";
import WorksheetReport from "@/components/WorksheetReport";
import CuttingPlanDocument from "@/components/CuttingPlanDocument";
import WindowsListDocument from "@/components/WindowsListDocument";
import PrintStyles from "@/components/PrintStyles";
import { cn } from "@/lib/utils";

export type WorksheetTab = "report" | "cutting-plan" | "windows-list";

interface WorksheetHubProps {
    worksheetId: string;
    worksheetName: string;
    createdAt: Date;
    input: WindowInput;
    result: CalculationResult | null;
    sectionName?: string;
    initialTab: WorksheetTab;
}

const TABS: { key: WorksheetTab; label: string; icon: typeof LayoutList }[] = [
    { key: "report", label: "Report", icon: LayoutList },
    { key: "cutting-plan", label: "Cutting Plan", icon: Scissors },
    { key: "windows-list", label: "Windows List", icon: List },
];

/**
 * Report, Cutting Plan, and Windows List used to be three separate routes
 * that only linked back to a common parent — comparing two meant two full
 * navigations. All three already fetch the exact same worksheet data, so
 * this hub fetches it once (in the page.tsx that renders this component) and
 * switches between tabs with local state — no network round-trip, no
 * re-fetch, just an instant re-render. The URL you land on (one of the three
 * original routes) still determines which tab opens first, so existing
 * links and bookmarks keep working.
 */
export default function WorksheetHub({
    worksheetId,
    worksheetName,
    createdAt,
    input,
    result,
    sectionName,
    initialTab,
}: WorksheetHubProps) {
    const [activeTab, setActiveTab] = useState<WorksheetTab>(initialTab);

    return (
        <div className="min-h-screen bg-slate-50 print:bg-white px-4 sm:px-6 lg:px-8 py-4 md:py-8 print:p-0 font-sans">
            <PrintStyles />
            {/* Screen width matches the header's max-w-7xl; print keeps the
                original max-w-6xl so the printed page is unaffected by
                whatever width the screen happened to be shown at. */}
            <div className="max-w-7xl print:max-w-6xl mx-auto space-y-4 print:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                    <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm w-fit" role="tablist" aria-label="Worksheet views">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                    activeTab === tab.key
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === "report" && (
                    <WorksheetReport
                        worksheetId={worksheetId}
                        worksheetName={worksheetName}
                        createdAt={createdAt}
                        input={input}
                        result={result}
                        sectionName={sectionName}
                        embedded
                    />
                )}
                {activeTab === "cutting-plan" && (
                    <CuttingPlanDocument
                        worksheetId={worksheetId}
                        worksheetName={worksheetName}
                        createdAt={createdAt}
                        result={result}
                        embedded
                    />
                )}
                {activeTab === "windows-list" && (
                    <WindowsListDocument
                        worksheetId={worksheetId}
                        worksheetName={worksheetName}
                        createdAt={createdAt}
                        input={input}
                        embedded
                    />
                )}
            </div>
        </div>
    );
}
