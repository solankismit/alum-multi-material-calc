"use server";

import { getQuotation } from "../actions";
import { formatCurrency } from "@/utils/formatters";
import ClientPrintButton from "@/app/worksheets/orderbook/ClientPrintButton";
import QuotationHeaderActions from "./QuotationHeaderActions";
import QuotationStatusActions from "./QuotationStatusActions";
import WindowSchematic from "@/components/WindowSchematic";
import type { WindowInput } from "@/types";
import { Download } from "lucide-react";

interface PageProps {
    params: Promise<{ id: string }>;
}

interface LineItem {
    name: string;
    quantity?: number;
    area?: number;
    unit: string;
    rate: number;
    cost: number;
}

interface QuotationPricing {
    profiles: LineItem[];
    glass: LineItem[];
    accessories: LineItem[];
    labor?: number;
    overhead?: number;
    profitMargin?: number;
    taxRate?: number;
}

export default async function QuotationView({ params }: PageProps) {
    const { id } = await params;
    const res = await getQuotation(id);

    if (!res.success || !res.data) {
        return (
            <div className="p-8 text-center text-red-500">
                Error: {res.error || "Quotation not found"}
            </div>
        );
    }

    const quote = res.data;
    const pricing = quote.pricingData as unknown as QuotationPricing;

    const profilesTotal = pricing.profiles.reduce((acc, curr) => acc + curr.cost, 0);
    const glassTotal = pricing.glass.reduce((acc, curr) => acc + curr.cost, 0);
    const accessoriesTotal = pricing.accessories.reduce((acc, curr) => acc + curr.cost, 0);
    const subTotal = profilesTotal + glassTotal + accessoriesTotal + (pricing.labor || 0) + (pricing.overhead || 0);
    const profitMargin = pricing.profitMargin || 0;
    const taxRate = pricing.taxRate || 0;

    const business = {
        name: quote.user?.company || quote.user?.name || "Your Company",
        address: quote.user?.businessAddress,
        phone: quote.user?.businessPhone,
    };

    // Diagrams are only meaningful for a quotation created from a worksheet —
    // a direct/blank quotation has no window geometry to draw.
    const worksheetInput = quote.worksheet?.data
        ? ((quote.worksheet.data as { input?: WindowInput }).input)
        : undefined;
    const diagramSections = (worksheetInput?.sections || []).map((section) => {
        const firstDim = section.dimensions?.[0];
        const panels = firstDim?.sections;
        const isOpenable = typeof panels === "number" && panels > 0;
        const qty = section.dimensions?.reduce((sum, d) => sum + (d.quantity || 0), 0) || 0;
        return {
            id: section.id,
            name: section.name,
            trackType: isOpenable ? "openable" : section.trackType,
            configuration: section.configuration,
            panels: isOpenable ? (panels as number) : 2,
            qty,
        };
    });

    return (
        <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
            <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none p-8 md:p-12" id="printable-area">

                {/* Header Actions (Hidden continuously in print) */}
                <div className="print:hidden flex justify-between items-center mb-8">
                    <QuotationHeaderActions />
                    <div className="flex items-center gap-3">
                        <QuotationStatusActions id={quote.id} status={quote.status} />
                        <a
                            href={`/quotations/${quote.id}/pdf`}
                            download
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </a>
                        <ClientPrintButton />
                    </div>
                </div>

                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">QUOTATION</h1>
                        <p className="text-slate-500">#{quote.quotationNumber}</p>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-xl text-slate-800">{business.name}</div>
                        {business.address && <div className="text-slate-500 text-sm">{business.address}</div>}
                        {business.phone && <div className="text-slate-500 text-sm">{business.phone}</div>}
                        <div className="text-slate-500 text-sm mt-2">Date: {new Date(quote.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="mb-12">
                    <h3 className="text-slate-500 uppercase text-xs font-bold mb-2">Bill To</h3>
                    <div className="text-xl font-semibold text-slate-800">{quote.clientName || "Valued Client"}</div>
                    {quote.clientPhone && <div className="text-slate-500 text-sm mt-1">{quote.clientPhone}</div>}
                    {quote.clientAddress && <div className="text-slate-500 text-sm">{quote.clientAddress}</div>}
                </div>

                {/* Window Diagrams */}
                {diagramSections.length > 0 && (
                    <div className="mb-12">
                        <h3 className="text-slate-500 uppercase text-xs font-bold mb-4">Window Diagrams</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {diagramSections.map((section) => (
                                <div key={section.id} className="border border-slate-200 rounded-lg p-3">
                                    <WindowSchematic
                                        trackType={section.trackType}
                                        configuration={section.configuration}
                                        sections={section.panels}
                                    />
                                    <p className="text-xs font-semibold text-slate-700 mt-2 text-center">
                                        {section.name}{section.qty > 1 ? ` × ${section.qty}` : ""}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Itemized Table */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b border-slate-200 text-left">
                            <th className="py-3 font-semibold text-slate-600">Description</th>
                            <th className="py-3 font-semibold text-slate-600 text-right">Quantity</th>
                            <th className="py-3 font-semibold text-slate-600 text-right">Rate</th>
                            <th className="py-3 font-semibold text-slate-600 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {pricing.profiles.map((p, idx) => (
                            <tr key={`p-${idx}`}>
                                <td className="py-3">{p.name} (Aluminium Profile)</td>
                                <td className="py-3 text-right">{(p.quantity ?? 0).toFixed(2)} {p.unit}</td>
                                <td className="py-3 text-right">{formatCurrency(p.rate)}</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(p.cost)}</td>
                            </tr>
                        ))}
                        {pricing.glass.map((g, idx) => (
                            <tr key={`g-${idx}`}>
                                <td className="py-3">{g.name}</td>
                                <td className="py-3 text-right">{(g.area ?? 0).toFixed(2)} {g.unit}</td>
                                <td className="py-3 text-right">{formatCurrency(g.rate)}</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(g.cost)}</td>
                            </tr>
                        ))}
                        {pricing.accessories.filter((a) => a.cost > 0).map((a, idx) => (
                            <tr key={`a-${idx}`}>
                                <td className="py-3">{a.name}</td>
                                <td className="py-3 text-right">{(a.quantity ?? 0).toFixed(2)} {a.unit}</td>
                                <td className="py-3 text-right">{formatCurrency(a.rate)}</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(a.cost)}</td>
                            </tr>
                        ))}

                        {(pricing.labor ?? 0) > 0 && (
                            <tr>
                                <td className="py-3">Labor Charges</td>
                                <td className="py-3 text-right">-</td>
                                <td className="py-3 text-right">-</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(pricing.labor || 0)}</td>
                            </tr>
                        )}
                        {(pricing.overhead ?? 0) > 0 && (
                            <tr>
                                <td className="py-3">Overhead / Misc</td>
                                <td className="py-3 text-right">-</td>
                                <td className="py-3 text-right">-</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(pricing.overhead || 0)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-1/2 space-y-3">
                        <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subTotal)}</span>
                        </div>
                        {profitMargin > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Profit ({profitMargin}%)</span>
                                <span>{formatCurrency(subTotal * (profitMargin / 100))}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                            <span>Tax ({taxRate}%)</span>
                            <span>{formatCurrency(subTotal * (1 + profitMargin / 100) * (taxRate / 100))}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-bold text-slate-900 border-t-2 border-slate-900 pt-3 mt-3">
                            <span>Total</span>
                            <span>{formatCurrency(quote.totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer terms */}
                <div className="mt-16 pt-8 border-t border-slate-200 text-slate-500 text-sm">
                    <p className="font-bold mb-2">Terms & Conditions</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Payment terms: 50% advance, balance upon completion.</li>
                        <li>Valid for 30 days from date of issue.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
