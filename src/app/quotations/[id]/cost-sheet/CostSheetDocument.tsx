"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import PrintStyles from "@/components/PrintStyles";
import ClientPrintButton from "@/app/worksheets/orderbook/ClientPrintButton";
import { formatCurrency } from "@/utils/formatters";
import { formatLength, UNIT_LABELS, type LengthUnit } from "@/utils/units";
import {
    deriveQuotationTotals,
    splitTax,
    type LineItem,
    type PricingData,
} from "@/utils/quotationPricing";
import type { CompanySnapshot } from "@/utils/companyConfig";

interface CostSheetDocumentProps {
    quote: {
        id: string;
        quotationNumber: string | null;
        createdAt: Date;
        clientName: string | null;
        customerRef: string | null;
    };
    pricing: PricingData;
    business: CompanySnapshot;
    taxType: "CGST_SGST" | "IGST";
    displayUnit: LengthUnit;
}

/** Amount a line is priced on — quantity for counted/weighed items, area for
 * the per-sqft ones. Both are optional on LineItem, only one is ever set. */
function lineAmount(line: LineItem): number {
    return line.quantity ?? line.area ?? 0;
}

/**
 * Internal cost sheet — the workshop's view of what a quotation costs to make.
 *
 * Deliberately its own route rather than another mode on QuotationDocument:
 *
 *  - Printing a quotation calls markQuotationPrinted() and locks it from
 *    further editing. A cost sheet is an internal working document and must
 *    not do that, so this uses the plain non-locking ClientPrintButton.
 *  - The customer PDF is produced by html2canvas snapshotting the live DOM
 *    (see generatePdfBlob), which does not honour `@media print` and only
 *    skips `.print:hidden`. Cost content that must print therefore cannot be
 *    hidden from that snapshot — no class combination satisfies both. Keeping
 *    it on a separate page makes the leak structurally impossible.
 *
 * The margin toggle is local state, never a URL parameter: QuotationDocument
 * deliberately moved its internal view off the URL so a forwarded link could
 * not expose profit, and a `?variant=full` here would undo that.
 */
export default function CostSheetDocument({
    quote,
    pricing,
    business,
    taxType,
    displayUnit,
}: CostSheetDocumentProps) {
    const [showMargins, setShowMargins] = useState(false);

    const t = deriveQuotationTotals(pricing);
    const taxSplit = splitTax(t.taxAmount, taxType);
    const unitLabel = UNIT_LABELS[displayUnit];

    // Sections when the quotation has them, otherwise the flat arrays that
    // older/freeform quotations still use.
    const groups = t.usesSections
        ? pricing.sections!.map((s) => ({
            key: s.sectionId,
            title: s.sectionName + (s.qty > 1 ? ` × ${s.qty}` : ""),
            subtitle: [
                s.configLabel || s.sectionTypeName,
                (s.widthMm || s.heightMm)
                    ? `${formatLength(s.widthMm || 0, displayUnit)} × ${formatLength(s.heightMm || 0, displayUnit)} ${unitLabel}`
                    : null,
                `${s.areaSqFt.toFixed(2)} sq.ft`,
                typeof s.materialWastagePercent === "number"
                    ? `${s.materialWastagePercent.toFixed(1)}% wastage`
                    : null,
            ].filter(Boolean).join(" — "),
            lines: [...s.profiles, ...s.glass, ...s.accessories].filter((l) => l.cost > 0),
            subtotal: s.subtotal,
        }))
        : [{
            key: "all",
            title: "Materials",
            subtitle: "",
            lines: [...pricing.profiles, ...pricing.glass, ...pricing.accessories].filter((l) => l.cost > 0),
            subtotal: t.materialCost,
        }];

    const itemizedLabor = pricing.laborBreakdown?.mode === "itemized"
        ? pricing.laborBreakdown.items.filter((i) => i.amount > 0)
        : [];

    return (
        <div className="min-h-screen bg-surface-muted px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:bg-white">
            <PrintStyles />

            <div className="max-w-5xl mx-auto print:hidden mb-3 flex items-center justify-between">
                <Breadcrumbs
                    items={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Quotations", href: "/quotations" },
                        { label: quote.quotationNumber || "Quotation", href: `/quotations/${quote.id}` },
                        { label: "Cost Sheet" },
                    ]}
                />
                <Link
                    href={`/quotations/${quote.id}`}
                    className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Quotation
                </Link>
            </div>

            <div className="max-w-5xl print:max-w-4xl mx-auto bg-surface shadow-lg print:shadow-none p-8 md:p-10 print:p-0 text-sm print:text-[11px]">
                <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6">
                    <button
                        type="button"
                        onClick={() => setShowMargins((v) => !v)}
                        aria-pressed={showMargins}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text border border-border rounded-md px-2.5 py-1.5"
                    >
                        {showMargins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showMargins
                            ? "Showing margin & customer price — switch to workshop sheet"
                            : "Show margin & customer price"}
                    </button>
                    <ClientPrintButton label={showMargins ? "Print Full Internal Sheet" : "Print Cost Sheet"} />
                </div>

                <div className="mb-6 bg-warning-surface border border-warning-border text-warning text-xs font-medium rounded-lg px-3 py-2 print:hidden">
                    Internal document — costs{showMargins ? ", profit margin and customer price" : ""}.
                    Not for the customer. Printing this does not lock the quotation.
                </div>

                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6 print:pb-2 print:mb-3">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 print:text-xl">
                            {showMargins ? "INTERNAL COST SHEET" : "COST SHEET"}
                        </h1>
                        <p className="text-slate-500">
                            Quotation #{quote.quotationNumber ?? "—"}
                            {quote.clientName ? ` · ${quote.clientName}` : ""}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-lg text-slate-800 print:text-base">{business.name}</div>
                        <div className="text-slate-500 text-xs">
                            {new Date(quote.createdAt).toLocaleDateString()}
                            {quote.customerRef ? ` · Ref ${quote.customerRef}` : ""}
                        </div>
                    </div>
                </div>

                {groups.map((group) => (
                    <div key={group.key} className="mb-6 print:mb-3 print:break-inside-avoid">
                        <div className="mb-1">
                            <h2 className="font-semibold text-slate-800">{group.title}</h2>
                            {group.subtitle && <p className="text-xs text-slate-500">{group.subtitle}</p>}
                        </div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                                    <th className="py-1.5 font-semibold">Item</th>
                                    <th className="py-1.5 font-semibold text-right w-28">Qty</th>
                                    <th className="py-1.5 font-semibold text-right w-24">Rate</th>
                                    <th className="py-1.5 font-semibold text-right w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {/* The key belongs on the Fragment (the mapped element),
                                    not the inner row — hence the explicit Fragment
                                    rather than shorthand syntax. */}
                                {group.lines.map((line, idx) => (
                                    <Fragment key={`${group.key}-${idx}`}>
                                        <tr>
                                            <td className="py-1.5">{line.name}</td>
                                            <td className="py-1.5 text-right">
                                                {lineAmount(line).toFixed(2)} {line.unit}
                                            </td>
                                            <td className="py-1.5 text-right">{formatCurrency(line.rate)}</td>
                                            <td className="py-1.5 text-right font-medium">{formatCurrency(line.cost)}</td>
                                        </tr>
                                        {/* A combined line (e.g. Material = frame + shutter +
                                            interlock) shows what makes up its weight, since the
                                            workshop needs the per-member figures. */}
                                        {line.components?.map((component) => (
                                            <tr key={component.key ?? component.name} className="text-xs text-slate-500">
                                                <td className="py-1 pl-4">↳ {component.name}</td>
                                                <td className="py-1 text-right">
                                                    {component.quantity.toFixed(2)} {component.unit}
                                                </td>
                                                <td colSpan={2} />
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                                <tr className="border-t border-slate-300 font-semibold">
                                    <td className="py-1.5" colSpan={3}>Section total</td>
                                    <td className="py-1.5 text-right">{formatCurrency(group.subtotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ))}

                <div className="border-t-2 border-slate-800 pt-4 print:pt-2 space-y-1 max-w-md ml-auto">
                    <Row label="Material & Hardware" value={t.materialCost} />
                    {itemizedLabor.length > 0
                        ? itemizedLabor.map((item) => (
                            <Row key={item.name} label={`Labour — ${item.name}`} value={item.amount} muted />
                        ))
                        : null}
                    <Row label="Labour" value={t.laborCost} />

                    <div className="flex justify-between font-bold text-base border-t border-slate-300 pt-1.5">
                        <span>Total Cost to Make</span>
                        <span>{formatCurrency(t.productionCost)}</span>
                    </div>

                    {showMargins && (
                        <div className="pt-2 mt-2 border-t border-slate-200 space-y-1">
                            {t.overheadCost > 0 && <Row label="Overhead" value={t.overheadCost} />}
                            {t.installationAmount > 0 && <Row label="Installation" value={t.installationAmount} />}
                            {t.transportationAmount > 0 && <Row label="Transportation" value={t.transportationAmount} />}
                            <Row label="Subtotal" value={t.subTotal} />
                            {t.discountAmount > 0 && <Row label="Discount" value={-t.discountAmount} />}
                            <Row label={`Profit Margin (${t.profitMargin}%)`} value={t.profitAmount} />
                            {t.taxRate > 0 && (
                                taxType === "IGST"
                                    ? <Row label={`IGST (${t.taxRate}%)`} value={taxSplit.igst} />
                                    : <>
                                        <Row label={`CGST (${t.taxRate / 2}%)`} value={taxSplit.cgst} />
                                        <Row label={`SGST (${t.taxRate / 2}%)`} value={taxSplit.sgst} />
                                    </>
                            )}
                            <div className="flex justify-between font-bold text-base border-t border-slate-300 pt-1.5">
                                <span>Customer Price</span>
                                <span>{formatCurrency(t.finalTotal)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 pt-1">
                                <span>Gross margin over cost</span>
                                <span>
                                    {t.productionCost > 0
                                        ? `${(((t.finalTotal - t.productionCost) / t.productionCost) * 100).toFixed(1)}%`
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
    return (
        <div className={`flex justify-between ${muted ? "text-xs text-slate-500 pl-3" : "text-slate-700"}`}>
            <span>{label}</span>
            <span>{formatCurrency(value)}</span>
        </div>
    );
}
