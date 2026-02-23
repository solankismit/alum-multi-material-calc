import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CalculationResult, MaterialRequirement, SectionResult } from "@/types";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import ClientPrintButton from "./ClientPrintButton";
// import ClientPrintButton from "./ClientPrintButton"; // We'll create this small client component

interface OrderbookParams {
    searchParams: Promise<{ ids?: string }>;
}

type StockCategory = "Frame" | "Shutter" | "Interlock" | "Other";

interface StockAggregation {
    stockName: string;
    stockLength: number;
    totalNeeded: number;
    category: StockCategory;
    usageDetails: string[]; // e.g. "Worksheet A: 5, Worksheet B: 2"
    pieceBreakdown?: Record<string, number>;
}

interface GlassAggregation {
    width: number;
    height: number;
    totalQuantity: number;
    totalArea: number;
}

function getCategory(componentName: string): StockCategory {
    const lower = componentName.toLowerCase();
    if (lower.includes("frame")) return "Frame";
    if (lower.includes("shutter")) return "Shutter";
    if (lower.includes("interlock")) return "Interlock";
    return "Other";
}

function formatPieceType(pType: string): string {
    const parts = pType.split('-');
    if (parts.length === 2) {
        // e.g. "width-1200"
        return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} (${parts[1]} mm)`;
    } else if (parts.length === 3) {
        // e.g. "g-width-1200" or "m-height-1200"
        const prefix = parts[0] === 'g' ? 'Glass' : parts[0] === 'm' ? 'Mesh' : parts[0];
        const dimension = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        return `${prefix} ${dimension} (${parts[2]} mm)`;
    }
    return pType.replace(/([A-Z])/g, ' $1').trim();
}

export default async function OrderbookPage({ searchParams }: OrderbookParams) {
    const session = await verifySession();
    if (!session?.userId) return redirect("/login");

    const { ids } = await searchParams;
    if (!ids) return <div className="p-8 text-center text-red-500">No worksheets selected.</div>;

    const worksheetIds = ids.split(",").filter(Boolean);

    const worksheets = await db.worksheet.findMany({
        where: {
            id: { in: worksheetIds },
            userId: session.userId,
        },
    });

    if (worksheets.length === 0) return <div className="p-8 text-center">No worksheets found.</div>;

    // --- Aggregation Logic ---

    interface SectionGroup {
        sectionTypeName: string;
        totalFrames: number;
        stockMap: Map<string, StockAggregation>;
        glassMap: Map<string, GlassAggregation>;
        totalMosquitoCChannel: number;
        totalTrackCap: number;
        totalGlassArea: number;
    }

    const groups = new Map<string, SectionGroup>();

    worksheets.forEach((ws) => {
        const data = ws.data as any;
        const result = data.result as CalculationResult | null;
        if (!result) return;

        result.sectionResults.forEach((section: SectionResult) => {
            const windowSec = result.input.sections.find((s) => s.id === section.sectionId);
            const framesCount = windowSec?.dimensions.reduce((sum, d) => sum + (d.quantity || 0), 0) || 0;
            const windowName = section.sectionName ? `${section.sectionName} (${section.sectionTypeName})` : (section.sectionTypeName || "Custom Section");
            const groupKey = `${ws.name} - ${windowName}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    sectionTypeName: groupKey,
                    totalFrames: 0,
                    stockMap: new Map(),
                    glassMap: new Map(),
                    totalMosquitoCChannel: 0,
                    totalTrackCap: 0,
                    totalGlassArea: 0,
                });
            }

            const group = groups.get(groupKey)!;
            group.totalFrames += framesCount;
            group.totalMosquitoCChannel += section.accessories.mosquitoCChannel;
            group.totalTrackCap += section.accessories.trackCap;

            // Materials / Stock
            section.materials.forEach((mat: MaterialRequirement) => {
                const { stockBreakdown } = mat;
                const key = `${stockBreakdown.stockName}-${stockBreakdown.stockLength}`;

                if (!group.stockMap.has(key)) {
                    group.stockMap.set(key, {
                        stockName: stockBreakdown.stockName,
                        stockLength: stockBreakdown.stockLength,
                        totalNeeded: 0,
                        category: getCategory(mat.component),
                        usageDetails: [],
                        pieceBreakdown: {},
                    });
                }

                const entry = group.stockMap.get(key)!;
                entry.totalNeeded += stockBreakdown.stocksNeeded;
                entry.usageDetails.push(`${ws.name} (${section.sectionName}): ${stockBreakdown.stocksNeeded}`);

                // Accumulate precise piece counts
                if (stockBreakdown.pieceBreakdown) {
                    if (!entry.pieceBreakdown) entry.pieceBreakdown = {};
                    for (const [pType, count] of Object.entries(stockBreakdown.pieceBreakdown)) {
                        entry.pieceBreakdown[pType] = (entry.pieceBreakdown[pType] || 0) + count;
                    }
                }
            });

            // Glass
            section.glassInfo.forEach((glass) => {
                const gKey = `${glass.glassSize.width.toFixed(1)}x${glass.glassSize.height.toFixed(1)}`;

                if (!group.glassMap.has(gKey)) {
                    group.glassMap.set(gKey, {
                        width: glass.glassSize.width,
                        height: glass.glassSize.height,
                        totalQuantity: 0,
                        totalArea: 0,
                    });
                }

                const gEntry = group.glassMap.get(gKey)!;
                gEntry.totalQuantity += glass.quantity;
                gEntry.totalArea += glass.glassSize.totalArea;
                group.totalGlassArea += glass.glassSize.totalArea;
            });
        });
    });

    // Reusable Table Component
    function ProfileTable({ title, items, colorClass }: { title: string; items: StockAggregation[]; colorClass: string }) {
        if (items.length === 0) return null;
        return (
            <section className="print:break-inside-avoid mt-6">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm ${colorClass}`}></span>
                    {title}
                </h3>
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-semibold text-left border-b">
                            <tr>
                                <th className="px-4 py-3">Profile Name</th>
                                <th className="px-4 py-3 text-center w-32">Length (mm)</th>
                                <th className="px-4 py-3 text-left w-48">Cut Pieces Needed</th>
                                <th className="px-4 py-3 text-center w-32">Total Full Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => {
                                const pieces = item.pieceBreakdown ? Object.entries(item.pieceBreakdown) : [];

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900 align-top">{item.stockName}</td>
                                        <td className="px-4 py-3 text-center text-slate-600 align-top">{item.stockLength}</td>
                                        <td className="px-4 py-3 text-left text-sm text-slate-600">
                                            {pieces.length > 0 ? (
                                                <ul className="space-y-1">
                                                    {pieces.map(([pType, pQty], i) => (
                                                        <li key={i} className="flex justify-between border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                                                            <span className="text-slate-500 capitalize">{formatPieceType(pType)}:</span>
                                                            <strong className="text-slate-900 ml-2">{pQty}</strong>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span className="text-slate-400 italic">Standard cuts</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-indigo-700 text-lg bg-indigo-50/30 align-top">
                                            {item.totalNeeded}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans print:bg-white print:p-0">
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
                {/* Header Actions */}
                <div className="flex justify-between items-center print:hidden">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="text-slate-600 hover:text-slate-900 border border-slate-200 bg-white">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                    <ClientPrintButton />
                </div>

                {/* Report Content */}
                <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 print:shadow-none print:border-0">
                    {/* Title */}
                    <div className="bg-slate-900 text-white p-6 md:p-8 print:bg-white print:text-black print:p-0 print:border-b-2 print:border-black print:mb-6">
                        <h1 className="text-3xl font-bold mb-2">Orderbook Summary</h1>
                        <p className="text-slate-400 print:text-slate-600 text-sm md:text-base">
                            Generated on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
                        </p>
                        <div className="mt-4 text-xs md:text-sm bg-slate-800 inline-block px-3 py-1.5 rounded-lg text-slate-300 print:bg-slate-100 print:text-slate-800 shadow-inner">
                            <strong>Includes {worksheets.length} Worksheets:</strong> {worksheets.map((w) => w.name).join(", ")}
                        </div>
                    </div>

                    <div className="p-4 md:p-8 md:space-y-10 space-y-8 print:p-0 bg-slate-50/50">
                        {Array.from(groups.values()).map((group) => {
                            const stockList = Array.from(group.stockMap.values()).sort((a, b) => a.stockName.localeCompare(b.stockName));
                            const glassList = Array.from(group.glassMap.values()).sort((a, b) => b.totalArea - a.totalArea);

                            const frames = stockList.filter((s) => s.category === "Frame");
                            const shutters = stockList.filter((s) => s.category === "Shutter");
                            const interlocks = stockList.filter((s) => s.category === "Interlock");
                            const others = stockList.filter((s) => s.category === "Other");

                            return (
                                <div key={group.sectionTypeName} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-8 print:border-b-2 print:border-slate-300 print:pb-8 print:shadow-none print:break-inside-avoid">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                                {group.sectionTypeName}
                                            </h2>
                                            <p className="text-slate-500 text-sm mt-1">Section Requirements</p>
                                        </div>
                                        <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl font-bold text-lg inline-flex items-center gap-2 shadow-sm">
                                            <span>Required Quantity:</span>
                                            <span className="bg-indigo-600 text-white px-3 py-0.5 rounded-md">{group.totalFrames} Units</span>
                                        </div>
                                    </div>

                                    {/* Categorized Profiles */}
                                    <div className="space-y-6">
                                        <ProfileTable title="Frame Profiles" items={frames} colorClass="bg-indigo-600" />
                                        <ProfileTable title="Shutter Profiles" items={shutters} colorClass="bg-emerald-500" />
                                        <ProfileTable title="Interlock Profiles" items={interlocks} colorClass="bg-amber-500" />
                                        <ProfileTable title="Other Profiles" items={others} colorClass="bg-slate-500" />
                                    </div>

                                    {stockList.length === 0 && (
                                        <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">No profile data found for this section.</div>
                                    )}

                                    {/* Accessories & Hardware */}
                                    <section className="print:break-inside-avoid mt-8">
                                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                                            <span className="w-3 h-3 bg-purple-500 rounded-sm"></span>
                                            Hardware & Accessories
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex justify-between items-center transition-colors hover:bg-purple-50">
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">Mosquito Mesh / C-Channel</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Total running length</p>
                                                </div>
                                                <div className="text-xl font-black text-purple-700">
                                                    {group.totalMosquitoCChannel > 0 ? `${(group.totalMosquitoCChannel / 304.8).toFixed(1)} ft` : "N/A"}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex justify-between items-center transition-colors hover:bg-purple-50">
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">Track Cap (SS)</h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">Total running length</p>
                                                </div>
                                                <div className="text-xl font-black text-purple-700">
                                                    {group.totalTrackCap > 0 ? `${(group.totalTrackCap / 304.8).toFixed(1)} ft` : "N/A"}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Glass Order List */}
                                    <section className="print:break-inside-avoid mt-8">
                                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                                            <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
                                            Glass & Mesh Requirements
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            {group.totalMosquitoCChannel > 0 && (
                                                <div className="bg-white rounded-lg border border-purple-200 overflow-hidden shadow-sm">
                                                    <div className="bg-purple-50 px-4 py-2 border-b border-purple-100 font-semibold text-purple-800 text-sm flex justify-between">
                                                        <span>Mosquito Net & C-Channel</span>
                                                        <span>{((group.totalMosquitoCChannel) / 304.8).toFixed(1)} ft total</span>
                                                    </div>
                                                    <div className="p-4 text-sm text-slate-600 leading-relaxed">
                                                        <p>Requires total <strong>{(group.totalMosquitoCChannel).toFixed(0)} mm</strong> of Mosquito Net material and equivalent C-Channel rubber.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {glassList.length > 0 ? (
                                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 text-slate-700 font-semibold text-left border-b">
                                                        <tr>
                                                            <th className="px-4 py-3">Exact Cut Dimensions (W x H)</th>
                                                            <th className="px-4 py-3 text-center">Total Cut Pieces required</th>
                                                            <th className="px-4 py-3 text-right">Total Area (sq.ft)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {glassList.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-50">
                                                                    {item.width.toFixed(1)} x {item.height.toFixed(1)} mm
                                                                </td>
                                                                <td className="px-4 py-3 text-center font-bold text-slate-800 bg-blue-50/30">
                                                                    {item.totalQuantity} <span className="font-normal text-xs text-slate-500 ml-1">pieces</span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-slate-600 font-medium">
                                                                    {(item.totalArea / 92903).toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        <tr className="bg-slate-800 text-white font-bold">
                                                            <td className="px-4 py-3 text-right text-slate-300 text-xs uppercase tracking-wider">Total Glass Area</td>
                                                            <td className="px-4 py-3"></td>
                                                            <td className="px-4 py-3 text-right text-lg">
                                                                {(group.totalGlassArea / 92903).toFixed(2)} sq.ft
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">No glass required for this section.</div>
                                        )}
                                    </section>
                                </div>
                            );
                        })}

                        {groups.size === 0 && (
                            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Available</h3>
                                <p className="text-slate-500">The selected worksheets do not contain any material requirements.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-100 border-t border-slate-200 p-6 text-center text-sm text-slate-500 print:hidden">
                        Generated by AlumCalc • Material Calculator
                    </div>
                </div>
            </div>
        </div>
    );
}
