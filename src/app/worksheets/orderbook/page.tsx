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

    // 1. Profile / Stock Aggregation
    const stockMap = new Map<string, StockAggregation>();

    // 2. Glass Aggregation
    const glassMap = new Map<string, GlassAggregation>();

    // 3. Accessories Aggregation
    let totalMosquitoCChannel = 0;
    let totalTrackCap = 0;

    let totalProjectGlassArea = 0;

    worksheets.forEach(ws => {
        const data = ws.data as any;
        const result = data.result as CalculationResult | null;
        if (!result) return;

        // Accessories
        if (result.combinedSummary) {
            // Accessing sectionResults to sum accessories correctly if combinedSummary doesn't have them broken down raw
            // Actually, `SectionResult` has `accessories` object.
        }

        result.sectionResults.forEach((section: SectionResult) => {
            // Accessories
            totalMosquitoCChannel += section.accessories.mosquitoCChannel;
            totalTrackCap += section.accessories.trackCap;

            // Materials / Stock
            section.materials.forEach((mat: MaterialRequirement) => {
                const { stockBreakdown } = mat;
                const key = `${stockBreakdown.stockName}-${stockBreakdown.stockLength}`;

                if (!stockMap.has(key)) {
                    stockMap.set(key, {
                        stockName: stockBreakdown.stockName,
                        stockLength: stockBreakdown.stockLength,
                        totalNeeded: 0,
                        category: getCategory(mat.component),
                        usageDetails: []
                    });
                }

                const entry = stockMap.get(key)!;
                // If allStockCounts is available, use it (for complex optimizations), else use stocksNeeded
                // Actually `stocksNeeded` is the primary reliable number for the main stock
                entry.totalNeeded += stockBreakdown.stocksNeeded;
                entry.usageDetails.push(`${ws.name} (${section.sectionName}): ${stockBreakdown.stocksNeeded}`);
            });

            // Glass
            section.glassInfo.forEach(glass => {
                // Key by dimensions
                const gKey = `${glass.glassSize.width.toFixed(1)}x${glass.glassSize.height.toFixed(1)}`;

                if (!glassMap.has(gKey)) {
                    glassMap.set(gKey, {
                        width: glass.glassSize.width,
                        height: glass.glassSize.height,
                        totalQuantity: 0,
                        totalArea: 0
                    });
                }

                const gEntry = glassMap.get(gKey)!;
                gEntry.totalQuantity += glass.quantity;
                gEntry.totalArea += glass.glassSize.totalArea;

                totalProjectGlassArea += glass.glassSize.totalArea;
            });
        });

        // Accumulate totals from summaries if needed?
        // We are rebuilding totals from bottom up which is safer for aggregation.
    });

    // Convert Maps to Arrays and Group
    const stockList = Array.from(stockMap.values()).sort((a, b) => a.stockName.localeCompare(b.stockName));
    const glassList = Array.from(glassMap.values()).sort((a, b) => b.totalArea - a.totalArea);

    const frames = stockList.filter(s => s.category === "Frame");
    const shutters = stockList.filter(s => s.category === "Shutter");
    const interlocks = stockList.filter(s => s.category === "Interlock");
    const others = stockList.filter(s => s.category === "Other");

    // Reusable Table Component
    function ProfileTable({ title, items, colorClass }: { title: string, items: StockAggregation[], colorClass: string }) {
        if (items.length === 0) return null;
        return (
            <section className="print:break-inside-avoid">
                <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm ${colorClass}`}></span>
                    {title}
                </h2>
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                            <tr>
                                <th className="px-4 py-3">Profile Name</th>
                                <th className="px-4 py-3 text-center">Length (mm)</th>
                                <th className="px-4 py-3 text-center">Total Qty Needed</th>
                                <th className="px-4 py-3 text-right">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{item.stockName}</td>
                                    <td className="px-4 py-3 text-center text-slate-600">{item.stockLength}</td>
                                    <td className="px-4 py-3 text-center font-bold text-indigo-700 text-lg">
                                        {item.totalNeeded}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-400 text-xs">
                                        Full Lengths
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    }


    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans print:bg-white print:p-0">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header Actions */}
                <div className="flex justify-between items-center print:hidden">
                    <Link href="/dashboard">
                        <Button variant="ghost">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                    <ClientPrintButton />
                </div>

                {/* Report Content */}
                <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 print:shadow-none print:border-0">

                    {/* Title */}
                    <div className="bg-slate-900 text-white p-8 print:bg-white print:text-black print:p-0 print:border-b-2 print:border-black print:mb-6">
                        <h1 className="text-3xl font-bold mb-2">Orderbook Summary</h1>
                        <p className="text-slate-400 print:text-slate-600">
                            Generated on {new Date()?.toLocaleDateString("en-IN", { dateStyle: "long" })}
                        </p>
                        <div className="mt-4 text-sm bg-slate-800 inline-block px-3 py-1 rounded text-slate-300 print:bg-slate-100 print:text-slate-800">
                            Includes {worksheets.length} Worksheets: {worksheets.map(w => w.name).join(", ")}
                        </div>
                    </div>

                    <div className="p-8 space-y-10 print:p-0">

                        {/* 1. Categorized Profiles */}
                        <ProfileTable title="Frame Sections" items={frames} colorClass="bg-indigo-600" />
                        <ProfileTable title="Shutter Sections" items={shutters} colorClass="bg-emerald-500" />
                        <ProfileTable title="Interlock Sections" items={interlocks} colorClass="bg-amber-500" />
                        <ProfileTable title="Other Profiles" items={others} colorClass="bg-slate-500" />

                        {stockList.length === 0 && (
                            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded border">No profile data found.</div>
                        )}

                        {/* 2. Accessories Summary */}
                        <section className="print:break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-purple-500 rounded-sm"></span>
                                Accessories & Hardware
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded border border-slate-200">
                                    <h4 className="font-semibold text-slate-700 mb-1">Mosquito Mesh / C-Channel</h4>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {totalMosquitoCChannel > 0
                                            ? `${(totalMosquitoCChannel / 304.8).toFixed(1)} ft`
                                            : "N/A"
                                        }
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Total running length</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded border border-slate-200">
                                    <h4 className="font-semibold text-slate-700 mb-1">Track Cap (Stainless Steel)</h4>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {totalTrackCap > 0
                                            ? `${(totalTrackCap / 304.8).toFixed(1)} ft`
                                            : "N/A"
                                        }
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Total running length</p>
                                </div>
                            </div>
                        </section>

                        {/* 3. Glass Order List */}
                        <section className="print:break-inside-avoid">
                            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-400 rounded-sm"></span>
                                Glass Order List
                            </h2>
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-700 font-semibold text-left">
                                        <tr>
                                            <th className="px-4 py-3">Dimensions (W x H)</th>
                                            <th className="px-4 py-3 text-center">Quantity</th>
                                            <th className="px-4 py-3 text-right">Total Area (sq.ft)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {glassList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {item.width.toFixed(1)} x {item.height.toFixed(1)} mm
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-800">
                                                    {item.totalQuantity}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-600">
                                                    {(item.totalArea / 92903).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        {glassList.length > 0 && (
                                            <tr className="bg-slate-50 font-bold border-t border-slate-300">
                                                <td className="px-4 py-3 text-right">Total Project Glass Area</td>
                                                <td className="px-4 py-3"></td>
                                                <td className="px-4 py-3 text-right text-indigo-700">
                                                    {(totalProjectGlassArea / 92903).toFixed(2)} sq.ft
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                    </div>

                    <div className="bg-slate-50 border-t border-slate-200 p-6 text-center text-sm text-slate-500 print:hidden">
                        Generated by Aluminium Materials Calculator
                    </div>
                </div>
            </div>
        </div>
    );
}
