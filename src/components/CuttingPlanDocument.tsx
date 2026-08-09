"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { CalculationResult } from "@/types";
import { Button } from "@/components/ui/Button";
import { aggregatePlans, getPieceDescription } from "@/utils/cuttingPlanHelpers";
import { resolveMaterialCategory, MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS } from "@/utils/materialCategory";
import PrintStyles from "@/components/PrintStyles";

interface CuttingPlanDocumentProps {
    worksheetId: string;
    worksheetName: string;
    createdAt: Date;
    result: CalculationResult | null;
}

export default function CuttingPlanDocument({
    worksheetName,
    createdAt,
    result,
}: CuttingPlanDocumentProps) {
    const router = useRouter();

    const handlePrint = () => window.print();

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

    return (
        <div className="min-h-screen bg-slate-50 print:bg-white p-4 md:p-8 print:p-0 font-sans">
            <PrintStyles />
            <div className="max-w-5xl mx-auto space-y-6 print:space-y-4">

                {/* Header Actions */}
                <div className="flex items-center justify-between print:hidden">
                    <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </Button>
                    <Button onClick={handlePrint} variant="outline" className="border-slate-300 shadow-sm">
                        <Printer className="w-4 h-4 mr-2" />
                        Print / Save PDF
                    </Button>
                </div>

                <div className="bg-white print:shadow-none shadow-xl rounded-xl overflow-hidden border border-slate-200 print:border-0">
                    <div className="p-6 md:p-8 print:p-0 border-b-2 border-black print:mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">Cutting Plan — {worksheetName}</h1>
                        <p className="text-slate-500 text-sm mt-1">Generated: {dateStr}</p>
                    </div>

                    <div className="p-6 md:p-8 print:p-0 space-y-10">
                        {result.sectionResults.map((secResult, sIdx) => (
                            <div key={sIdx} className="space-y-6 print:break-before-page">
                                <div className="bg-indigo-50 p-4 rounded-r-xl border-l-4 border-indigo-600 print:bg-transparent print:border-l-0 print:p-0 print:border-b-2 print:border-black print:mb-4">
                                    <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tight">{secResult.sectionName}</h2>
                                    {secResult.sectionTypeName && (
                                        <p className="text-indigo-700/80 font-semibold text-sm mt-1 uppercase tracking-wider">System: {secResult.sectionTypeName}</p>
                                    )}
                                </div>

                                {MATERIAL_CATEGORIES.map((category) => {
                                    const categoryMaterials = secResult.materials.filter((m) => resolveMaterialCategory(m) === category);
                                    if (categoryMaterials.length === 0) return null;

                                    return (
                                        <section key={category} className="print:break-inside-avoid">
                                            <h4 className="font-bold text-slate-700 mb-3 px-2 border-l-2 border-emerald-400 uppercase">
                                                {MATERIAL_CATEGORY_LABELS[category]}
                                            </h4>

                                            <div className="space-y-4">
                                                {categoryMaterials.map((mat, mIdx) => {
                                                    if (!mat.stockBreakdown.cuttingPlans) return null;
                                                    const aggregatedPlans = aggregatePlans(
                                                        mat.stockBreakdown.cuttingPlans,
                                                        mat.stockBreakdown.stockLength,
                                                        mat.stockBreakdown.stockName
                                                    );

                                                    return (
                                                        <div key={mIdx} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                                                                <span className="font-semibold text-slate-800 text-sm">{mat.component}</span>
                                                                <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-slate-500">
                                                                    {mat.stockBreakdown.stocksNeeded} x {mat.stockBreakdown.stockName} ({mat.stockBreakdown.stockLength}mm) — {mat.stockBreakdown.wastagePercent.toFixed(1)}% wastage
                                                                </span>
                                                            </div>

                                                            <div className="p-4 space-y-3">
                                                                {aggregatedPlans.map((plan, pIdx) => (
                                                                    <div key={pIdx} className="flex flex-col sm:flex-row print:flex-row gap-4 items-start sm:items-center print:items-center text-sm border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                                                                        <div className="shrink-0 w-16 text-center">
                                                                            <span className="inline-block bg-slate-900 text-white text-lg font-bold px-3 py-1 rounded shadow-sm">
                                                                                {plan.count}x
                                                                            </span>
                                                                            <div className="text-[10px] text-slate-400 mt-1 uppercase">Bars</div>
                                                                        </div>

                                                                        <div className="flex-1 w-full min-w-0">
                                                                            <div className="h-8 flex w-full rounded border border-slate-300 overflow-hidden bg-slate-100 mb-2">
                                                                                {plan.pieces.map((len, pieceIdx) => {
                                                                                    const percent = (len / plan.stockLength) * 100;
                                                                                    const type = plan.pieceTypes?.[pieceIdx] || "";
                                                                                    let colorClass = "bg-indigo-200 text-indigo-900 border-indigo-300";
                                                                                    if (type.includes("width")) colorClass = "bg-emerald-200 text-emerald-900 border-emerald-300";
                                                                                    if (type.includes("interlock")) colorClass = "bg-amber-200 text-amber-900 border-amber-300";
                                                                                    if (type.includes("m-height") || type.includes("m-width")) colorClass = "bg-rose-200 text-rose-900 border-rose-300";
                                                                                    if (type.includes("track")) colorClass = "bg-cyan-200 text-cyan-900 border-cyan-300";
                                                                                    if (type.includes("mullion")) colorClass = "bg-purple-200 text-purple-900 border-purple-300";

                                                                                    return (
                                                                                        <div
                                                                                            key={pieceIdx}
                                                                                            style={{ width: `${percent}%` }}
                                                                                            className={`h-full border-r ${colorClass} flex items-center justify-center text-xs font-medium`}
                                                                                            title={`${len}mm`}
                                                                                        >
                                                                                            {percent > 5 && len}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                {plan.wastage > 0 && (
                                                                                    <div className="flex-1 bg-red-50 text-red-300 flex items-center justify-center text-[10px] italic">
                                                                                        Scrap ({plan.wastage.toFixed(0)})
                                                                                    </div>
                                                                                )}
                                                                            </div>

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
                </div>
            </div>
        </div>
    );
}
