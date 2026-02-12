"use server";

import { getQuotation } from "../actions";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";
import ClientPrintButton from "@/app/worksheets/orderbook/ClientPrintButton";

interface PageProps {
    params: { id: string };
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
    const pricing = quote.pricingData as any;

    // Calculate subtotals for display if not saved explicitly
    const profilesTotal = pricing.profiles.reduce((acc: number, curr: any) => acc + curr.cost, 0);
    const glassTotal = pricing.glass.reduce((acc: number, curr: any) => acc + curr.cost, 0);
    const accessoriesTotal = pricing.accessories.reduce((acc: number, curr: any) => acc + curr.cost, 0);
    const subTotal = profilesTotal + glassTotal + accessoriesTotal + (pricing.labor || 0) + (pricing.overhead || 0);

    return (
        <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
            <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none p-8 md:p-12" id="printable-area">

                {/* Header Actions (Hidden continuously in print) */}
                <div className="print:hidden flex justify-between mb-8">
                    <Button variant="outline" asChild>
                        <a href="/dashboard">Back to Dashboard</a>
                    </Button>
                    <ClientPrintButton />
                </div>

                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">QUOTATION</h1>
                        <p className="text-slate-500">#{quote.quotationNumber}</p>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-xl text-slate-800">Your Company Name</div>
                        <div className="text-slate-500 text-sm">123 Business Road</div>
                        <div className="text-slate-500 text-sm">City, State 12345</div>
                        <div className="text-slate-500 text-sm mt-2">Date: {new Date(quote.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="mb-12">
                    <h3 className="text-slate-500 uppercase text-xs font-bold mb-2">Bill To</h3>
                    <div className="text-xl font-semibold text-slate-800">{quote.clientName || "Valued Client"}</div>
                </div>

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
                        {/* Profiles */}
                        {pricing.profiles.map((p: any, idx: number) => (
                            <tr key={`p-${idx}`}>
                                <td className="py-3">{p.name} (Aluminium Profile)</td>
                                <td className="py-3 text-right">{p.quantity.toFixed(2)} {p.unit}</td>
                                <td className="py-3 text-right">{formatCurrency(p.rate)}</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(p.cost)}</td>
                            </tr>
                        ))}
                        {/* Glass */}
                        {pricing.glass.map((g: any, idx: number) => (
                            <tr key={`g-${idx}`}>
                                <td className="py-3">{g.name}</td>
                                <td className="py-3 text-right">{g.area.toFixed(2)} {g.unit}</td>
                                <td className="py-3 text-right">{formatCurrency(g.rate)}</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(g.cost)}</td>
                            </tr>
                        ))}
                        {/* Accessories (Only show if cost > 0) */}
                        {pricing.accessories.filter((a: any) => a.cost > 0).map((a: any, idx: number) => (
                            <tr key={`a-${idx}`}>
                                <td className="py-3">{a.name}</td>
                                <td className="py-3 text-right">{a.quantity.toFixed(2)} {a.unit}</td>
                                <td className="py-3 text-right">{formatCurrency(a.rate)}</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(a.cost)}</td>
                            </tr>
                        ))}

                        {/* Labor */}
                        {pricing.labor > 0 && (
                            <tr>
                                <td className="py-3">Labor Charges</td>
                                <td className="py-3 text-right">-</td>
                                <td className="py-3 text-right">-</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(pricing.labor)}</td>
                            </tr>
                        )}
                        {/* Overhead */}
                        {pricing.overhead > 0 && (
                            <tr>
                                <td className="py-3">Overhead / Misc</td>
                                <td className="py-3 text-right">-</td>
                                <td className="py-3 text-right">-</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(pricing.overhead)}</td>
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
                        {pricing.profitMargin > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Profit ({pricing.profitMargin}%)</span>
                                <span>{formatCurrency(subTotal * (pricing.profitMargin / 100))}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                            <span>Tax ({pricing.taxRate}%)</span>
                            <span>{formatCurrency((subTotal * (1 + (pricing.profitMargin / 100))) * (pricing.taxRate / 100))}</span>
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
