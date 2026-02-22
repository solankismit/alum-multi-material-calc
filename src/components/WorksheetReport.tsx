"use client";

import { useMemo } from "react";
import { Printer, ArrowLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { CalculationResult, WindowInput, CuttingPlan } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface WorksheetReportProps {
    worksheetName: string;
    createdAt: Date;
    input: WindowInput;
    result: CalculationResult | null;
    sectionName?: string;
}

// Helper Types for Aggregation
interface AggregatedPlan {
    stockLength: number;
    stockName: string;
    pieces: number[];
    pieceTypes?: string[];
    wastage: number;
    count: number; // Multiplier (e.g., 4x)
}

// --- Helper Functions ---

function aggregatePlans(plans: CuttingPlan[], stockLength: number, stockName: string): AggregatedPlan[] {
    const groups: { [key: string]: AggregatedPlan } = {};

    plans.forEach(plan => {
        // Create a unique key based on pieces and their types
        // Sort pieces to ensure consistent key if order doesn't matter, 
        // but typically order matches the visual cut, so we might keep order.
        // For strict equality of "cutting pattern", exact sequence matters.
        const piecesKey = plan.pieces.join(',');
        const typesKey = plan.pieceTypes ? plan.pieceTypes.join(',') : '';
        const key = `${piecesKey}|${typesKey}|${plan.wastage}`;

        if (!groups[key]) {
            groups[key] = {
                stockLength,
                stockName: plan.stockName || stockName,
                pieces: plan.pieces,
                pieceTypes: plan.pieceTypes,
                wastage: plan.wastage,
                count: 0
            };
        }
        groups[key].count++;
    });

    // Return sorted by count (most frequent first)
    return Object.values(groups).sort((a, b) => b.count - a.count);
}

function getPieceDescription(pieces: number[], types?: string[]) {
    // Group by Type (Width vs Height vs Interlock) AND Length
    const summary: { [key: string]: number } = {};

    pieces.forEach((len, idx) => {
        const typeRaw = types?.[idx];
        let label = "Piece";
        if (typeRaw) {
            if (typeRaw.includes("width")) label = "Width";
            else if (typeRaw.includes("height")) label = "Height";
            else if (typeRaw.includes("interlock")) label = "Interlock";
        }
        const key = `${label} ${len}mm`;
        summary[key] = (summary[key] || 0) + 1;
    });

    return Object.entries(summary)
        .map(([key, count]) => `${count}x ${key}`)
        .join(", ");
}

function formatArea(areaSqMm: number) {
    const sqFt = areaSqMm / 92903;
    return sqFt.toFixed(2);
}

// --- Sub-Components ---

const SummaryCard = ({ title, value, subValue, highlight = false }: { title: string, value: string, subValue?: string, highlight?: boolean }) => (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-200'}`}>
        <div className="text-sm text-slate-500 font-medium">{title}</div>
        <div className={`text-2xl font-bold mt-1 ${highlight ? 'text-indigo-700' : 'text-slate-900'}`}>{value}</div>
        {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
    </div>
);

export default function WorksheetReport({
    worksheetName,
    createdAt,
    input,
    result,
    sectionName,
}: WorksheetReportProps) {
    const router = useRouter();

    const handlePrint = () => {
        window.print();
    };

    if (!result) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold text-red-600">No calculation result found.</h2>
                <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    const dateStr = new Date(createdAt).toLocaleDateString("en-IN", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // --- Global Calculations ---
    const totalGlassAreaSqFt = (result.combinedSummary.totalGlassArea || 0) / 92903;
    const totalWastageFt = (result.combinedSummary.totalWastage || 0) / 304.8;

    return (
        <div className="min-h-screen bg-slate-50 print:bg-white p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8 print:space-y-6">

                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
                    <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Dashboard
                    </Button>
                    <Button onClick={handlePrint} variant="outline" className="border-slate-300 shadow-sm">
                        <Printer className="w-4 h-4 mr-2" />
                        Print / Save PDF
                    </Button>
                </div>

                {/* Main Report Container */}
                <div className="bg-white print:shadow-none shadow-xl rounded-xl overflow-hidden border border-slate-200 print:border-0">

                    {/* Report Header */}
                    <div className="bg-slate-900 text-white p-6 md:p-8 print:bg-transparent print:text-black print:p-0 print:border-b-2 print:border-black print:mb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">{worksheetName}</h1>
                                <p className="text-slate-300 print:text-slate-600 text-sm">Created: {dateStr}</p>
                                {sectionName && (
                                    <div className="mt-4 inline-block bg-indigo-600 print:bg-slate-100 print:text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                        System: {sectionName}
                                    </div>
                                )}
                            </div>
                            <div className="text-right hidden sm:block">
                                <div className="text-4xl font-black text-indigo-400 print:text-black opacity-20 print:opacity-100">REPORT</div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 md:p-8 print:p-0 space-y-10">

                        {/* 1. Global Project Summary */}
                        <section className="print:break-inside-avoid">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-6 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                                Project Summary
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <SummaryCard
                                    title="Total Material Length"
                                    value={`${(result.combinedSummary.totalMaterial / 304.8).toFixed(1)} ft`}
                                    subValue="Combined profiles"
                                    highlight
                                />
                                <SummaryCard
                                    title="Total Glass Area"
                                    value={`${totalGlassAreaSqFt.toFixed(2)} sq.ft`}
                                    subValue="Across all sections"
                                />
                                {result.combinedSummary.totalMosquitoArea !== undefined && result.combinedSummary.totalMosquitoArea > 0 && (
                                    <SummaryCard
                                        title="Total Mosquito Area"
                                        value={`${(result.combinedSummary.totalMosquitoArea / 92903).toFixed(2)} sq.ft`}
                                        subValue="Across all sections"
                                    />
                                )}
                                <SummaryCard
                                    title="Total Wastage"
                                    value={`${totalWastageFt.toFixed(1)} ft`}
                                    subValue={`${result.combinedSummary.wastagePercent.toFixed(1)}% of used stock`}
                                />
                                <SummaryCard
                                    title="Est. Total Weight"
                                    value={`${result.combinedSummary.totalMaterial.toFixed(2)} kg`} // Placeholder logic reuse
                                    subValue="(Approximate)"
                                />
                            </div>
                        </section>

                        {/* Loop through Sections */}
                        {result.sectionResults.map((secResult, sIdx) => (
                            <div key={sIdx} className="space-y-8 print:break-before-page">

                                <div className="bg-indigo-50 p-5 rounded-r-xl border-l-4 border-indigo-600 shadow-sm mb-6 print:bg-transparent print:border-l-0 print:shadow-none print:p-0 print:mb-4 print:border-b-2 print:border-black">
                                    <h2 className="text-3xl font-black text-indigo-950 uppercase tracking-tight">{secResult.sectionName}</h2>
                                    <p className="text-indigo-700/80 font-semibold text-sm mt-1 uppercase tracking-wider">{secResult.sectionTypeName ? `System: ${secResult.sectionTypeName} • ` : ""}Section Details & Cutting Lists</p>
                                </div>

                                {/* A. Section Glass Order */}
                                <section className="print:break-inside-avoid">
                                    <h4 className="font-bold text-slate-700 mb-4 px-2 border-l-2 border-blue-400">Glass Order List</h4>
                                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100 text-slate-700 font-semibold text-left">
                                                <tr>
                                                    <th className="px-4 py-3">#</th>
                                                    <th className="px-4 py-3">Dimension Ref (WxH)</th>
                                                    <th className="px-4 py-3">Final Glass Size ( mm )</th>
                                                    <th className="px-4 py-3 text-center">Qty</th>
                                                    <th className="px-4 py-3 text-right">Area (sq.ft)</th>
                                                    <th className="px-4 py-3 text-right">Total Area</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {secResult.glassInfo.map((glass, gIdx) => (
                                                    <tr key={gIdx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-slate-400 text-xs">{gIdx + 1}</td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {input.sections.find(s => s.id === secResult.sectionId)?.dimensions.find(d => d.id === glass.dimensionId)?.width} x {input.sections.find(s => s.id === secResult.sectionId)?.dimensions.find(d => d.id === glass.dimensionId)?.height}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-900">
                                                            {glass.glassSize.width.toFixed(1)} x {glass.glassSize.height.toFixed(1)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">{glass.quantity}</td>
                                                        <td className="px-4 py-3 text-right text-slate-500">{(glass.glassSize.area / 92903).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-slate-700">{(glass.glassSize.totalArea / 92903).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-50 font-bold">
                                                    <td colSpan={5} className="px-4 py-3 text-right text-slate-700">Total Glass Area</td>
                                                    <td className="px-4 py-3 text-right text-indigo-700">
                                                        {(secResult.glassInfo.reduce((acc, g) => acc + g.glassSize.totalArea, 0) / 92903).toFixed(2)} sq.ft
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                {/* B. Material Optimization Categorized */}
                                {["Frame", "Shutter", "Interlock", "Track Rail"].map(category => {
                                    const categoryMaterials = secResult.materials.filter(m => m.component.includes(category));
                                    if (categoryMaterials.length === 0) return null;

                                    return (
                                        <section key={category} className="print:break-inside-avoid">
                                            <h4 className="font-bold text-slate-700 mb-4 px-2 border-l-2 border-emerald-400 uppercase">{category} Cutting Details</h4>

                                            <div className="space-y-6">
                                                {categoryMaterials.map((mat, mIdx) => {
                                                    if (!mat.stockBreakdown.cuttingPlans) return null;
                                                    const aggregatedPlans = aggregatePlans(mat.stockBreakdown.cuttingPlans, mat.stockBreakdown.stockLength, mat.stockBreakdown.stockName);

                                                    return (
                                                        <div key={mIdx} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                                            {/* Material Header */}
                                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                                                <span className="font-semibold text-slate-800 text-sm">{mat.component}</span>
                                                                <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-slate-500">
                                                                    Required: {mat.stockBreakdown.stocksNeeded} x {mat.stockBreakdown.stockName} ({mat.stockBreakdown.stockLength}mm)
                                                                </span>
                                                            </div>

                                                            {/* Cutting Plans Table */}
                                                            <div className="p-4 space-y-4">
                                                                {aggregatedPlans.map((plan, pIdx) => (
                                                                    <div key={pIdx} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center text-sm border-b border-slate-100 last:border-0 pb-4 last:pb-0">

                                                                        {/* Multiplier Badge */}
                                                                        <div className="shrink-0 w-16 text-center">
                                                                            <span className="inline-block bg-slate-900 text-white text-lg font-bold px-3 py-1 rounded shadow-sm">
                                                                                {plan.count}x
                                                                            </span>
                                                                            <div className="text-[10px] text-slate-400 mt-1 uppercase">Bar Count</div>
                                                                        </div>

                                                                        {/* Visual Bar */}
                                                                        <div className="flex-1 w-full min-w-0">
                                                                            <div className="h-8 flex w-full rounded border border-slate-300 overflow-hidden bg-slate-100 mb-2">
                                                                                {plan.pieces.map((len, pieceIdx) => {
                                                                                    const percent = (len / plan.stockLength) * 100;
                                                                                    const type = plan.pieceTypes?.[pieceIdx] || "";
                                                                                    // Color code based on type
                                                                                    let colorClass = "bg-indigo-200 text-indigo-900 border-indigo-300"; // default height
                                                                                    if (type.includes("width")) colorClass = "bg-emerald-200 text-emerald-900 border-emerald-300";
                                                                                    if (type.includes("interlock")) colorClass = "bg-amber-200 text-amber-900 border-amber-300";
                                                                                    if (type.includes("m-height") || type.includes("m-width")) colorClass = "bg-rose-200 text-rose-900 border-rose-300";
                                                                                    if (type.includes("track")) colorClass = "bg-cyan-200 text-cyan-900 border-cyan-300";

                                                                                    return (
                                                                                        <div
                                                                                            key={pieceIdx}
                                                                                            style={{ width: `${percent}%` }}
                                                                                            className={`h-full border-r ${colorClass} flex items-center justify-center text-xs font-medium relative group`}
                                                                                            title={`${len}mm`}
                                                                                        >
                                                                                            {percent > 5 && len}
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                                {/* Wastage */}
                                                                                {plan.wastage > 0 && (
                                                                                    <div className="flex-1 bg-red-50 text-red-300 flex items-center justify-center text-[10px] italic">
                                                                                        Scrap ({plan.wastage.toFixed(0)})
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Text Description */}
                                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                                                                <span className="font-semibold text-slate-900">Cuts:</span>
                                                                                <span>{getPieceDescription(plan.pieces, plan.pieceTypes)}</span>
                                                                                <span className="text-slate-300">|</span>
                                                                                <span className="text-red-500">Wastage: {plan.wastage.toFixed(1)}mm</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    );
                                })}

                            </div>
                        ))}

                    </div>

                    <div className="bg-slate-50 border-t border-slate-200 p-6 text-center text-sm text-slate-500 print:hidden">
                        Generated by Aluminium Materials Calculator
                    </div>
                </div>
            </div>
        </div>
    );
}
