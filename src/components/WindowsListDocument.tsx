"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WindowInput } from "@/types";
import { Button } from "@/components/ui/Button";
import WindowSchematic from "@/components/WindowSchematic";
import PrintStyles from "@/components/PrintStyles";
import { AREA_SQMM_PER_SQFT } from "@/utils/formatters";

interface WindowsListDocumentProps {
    worksheetId: string;
    worksheetName: string;
    createdAt: Date;
    input: WindowInput | null;
}

export default function WindowsListDocument({ worksheetId, worksheetName, createdAt, input }: WindowsListDocumentProps) {
    const handlePrint = () => window.print();

    if (!input) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold text-red-600">No window data found.</h2>
                <Link href={`/worksheets/${worksheetId}`}>
                    <Button className="mt-4">Back to Worksheet</Button>
                </Link>
            </div>
        );
    }

    const dateStr = new Date(createdAt).toLocaleDateString("en-IN", {
        year: "numeric", month: "long", day: "numeric",
    });

    let totalAreaSqFt = 0;
    let totalQty = 0;
    input.sections.forEach((section) => {
        section.dimensions.forEach((dim) => {
            if (!dim.width || !dim.height || !dim.quantity) return;
            totalAreaSqFt += (dim.width * dim.height * dim.quantity) / AREA_SQMM_PER_SQFT;
            totalQty += dim.quantity;
        });
    });

    return (
        <div className="min-h-screen bg-slate-50 print:bg-white p-4 md:p-8 print:p-0 font-sans">
            <PrintStyles />
            <div className="max-w-5xl mx-auto space-y-6 print:space-y-4">
                <div className="flex items-center justify-between print:hidden">
                    <Link href={`/worksheets/${worksheetId}`}>
                        <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-slate-900">
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Worksheet
                        </Button>
                    </Link>
                    <Button onClick={handlePrint} variant="outline" className="border-slate-300 shadow-sm">
                        <Printer className="w-4 h-4 mr-2" />
                        Print / Save PDF
                    </Button>
                </div>

                <div className="bg-white print:shadow-none shadow-xl rounded-xl overflow-hidden border border-slate-200 print:border-0">
                    <div className="p-6 md:p-8 print:p-0 border-b-2 border-black print:mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">Window List — {worksheetName}</h1>
                        <p className="text-slate-500 text-sm mt-1">Generated: {dateStr}</p>
                        <p className="text-slate-400 text-xs mt-1">For design confirmation — no pricing shown</p>
                    </div>

                    <div className="p-6 md:p-8 print:p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-6">
                        {input.sections.map((section) => {
                            const firstDim = section.dimensions?.[0];
                            const panels = firstDim?.sections;
                            const isOpenable = typeof panels === "number" && panels > 0;

                            return section.dimensions.map((dim, dIdx) => {
                                if (!dim.width || !dim.height || !dim.quantity) return null;
                                const areaSqFt = (dim.width * dim.height * dim.quantity) / AREA_SQMM_PER_SQFT;

                                return (
                                    <div key={`${section.id}-${dIdx}`} className="border border-slate-200 rounded-lg p-4 print:break-inside-avoid">
                                        <WindowSchematic
                                            trackType={isOpenable ? "openable" : section.trackType}
                                            configuration={section.configuration}
                                            sections={isOpenable ? (panels as number) : 2}
                                            widthMm={dim.width}
                                            heightMm={dim.height}
                                        />
                                        <div className="mt-3 text-sm space-y-1">
                                            <p className="font-semibold text-slate-800">{section.name}</p>
                                            <p className="text-slate-500">{dim.width} × {dim.height} mm</p>
                                            <div className="flex justify-between text-slate-500">
                                                <span>Qty: {dim.quantity}</span>
                                                <span>{areaSqFt.toFixed(2)} sq.ft</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })}
                    </div>

                    <div className="p-6 md:p-8 print:p-0 border-t border-slate-200 flex justify-between text-sm font-semibold text-slate-700">
                        <span>Total Quantity: {totalQty}</span>
                        <span>Total Area: {totalAreaSqFt.toFixed(2)} sq.ft</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
