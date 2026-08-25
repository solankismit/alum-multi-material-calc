"use client";

import { useRef, useState } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { formatCurrency } from "@/utils/formatters";
import PrintStyles from "@/components/PrintStyles";
import ClientPrintButton from "@/app/worksheets/orderbook/ClientPrintButton";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { useSharePdf } from "@/hooks/useSharePdf";
import InvoiceHeaderActions from "./InvoiceHeaderActions";
import InvoiceStatusActions from "./InvoiceStatusActions";
import FinalizeInvoiceButton from "./FinalizeInvoiceButton";
import { splitTax } from "@/utils/quotationPricing";
import type { CompanySnapshot } from "@/utils/companyConfig";
import type { InvoiceStatus } from "@prisma/client";

interface InvoiceLineView {
    id: string;
    description: string;
    quantity: number | null;
    unit: string | null;
    ratePerUnit: number | null;
    taxableAmount: number;
    hsnCode: string | null;
    gstRate: number | null;
}

interface InvoiceDocumentProps {
    invoice: {
        id: string;
        invoiceNumber: string | null;
        invoicePrefix: string;
        status: InvoiceStatus;
        createdAt: Date;
        finalizedAt: Date | null;
        buyerName: string;
        buyerAddress: string | null;
        buyerGstNumber: string | null;
        buyerPhone: string | null;
        gstRate: number | null;
        quotationNumber: string | null;
    };
    lines: InvoiceLineView[];
    business: CompanySnapshot;
    taxType: "CGST_SGST" | "IGST";
    locked: boolean;
    totals: {
        taxableAmount: number;
        cgst: number;
        sgst: number;
        igst: number;
        gstAmount: number;
        grandTotal: number;
        amountInWords: string;
    };
}

/**
 * Compliance-first hierarchy (design review Pass 1): seller name + GSTIN at
 * full weight, then TAX INVOICE + number/date, then Bill To with GSTIN at
 * the same weight as the buyer name, then the line table, then totals +
 * amount-in-words, then bank details, then terms/signatory. This is
 * deliberately NOT the same visual weighting as QuotationDocument's
 * marketing-style header (big document title, muted GST) — an accountant
 * scans a tax invoice for seller/buyer GSTIN and invoice number first.
 */
export default function InvoiceDocument({ invoice, lines, business, taxType, locked, totals }: InvoiceDocumentProps) {
    const [logoFailed, setLogoFailed] = useState(false);
    const printableRef = useRef<HTMLDivElement>(null);
    const sharePdfFile = useSharePdf(printableRef, `Invoice-${invoice.invoiceNumber}.pdf`);
    const isDraft = invoice.status === "DRAFT";

    return (
        <div className="min-h-screen bg-surface-muted px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:bg-white">
            <PrintStyles />
            <div className="max-w-7xl mx-auto print:hidden mb-3">
                <Breadcrumbs
                    items={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Invoices", href: "/invoices" },
                        { label: invoice.invoiceNumber || "Draft Invoice" },
                    ]}
                />
            </div>

            <div ref={printableRef} className="max-w-7xl print:max-w-4xl mx-auto bg-surface shadow-lg print:shadow-none p-8 md:p-12 print:p-0 text-sm print:text-[11px] relative" id="printable-area">
                {isDraft && (
                    <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
                        aria-hidden="true"
                    >
                        <span className="text-6xl print:text-5xl font-black text-slate-200 print:text-slate-300/60 -rotate-[30deg] whitespace-nowrap">
                            DRAFT — UNISSUED
                        </span>
                    </div>
                )}

                <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-8">
                    <InvoiceHeaderActions id={invoice.id} editable={!locked} />
                    <div className="flex flex-wrap items-center gap-2">
                        <InvoiceStatusActions id={invoice.id} status={invoice.status} />
                        {isDraft ? (
                            <FinalizeInvoiceButton id={invoice.id} invoicePrefix={invoice.invoicePrefix} />
                        ) : (
                            <>
                                <div className="h-6 w-px bg-border mx-1 hidden sm:block" aria-hidden="true" />
                                <WhatsAppShareButton
                                    file={sharePdfFile}
                                    message={`Hi ${invoice.buyerName || "there"}, please find your invoice ${invoice.invoiceNumber} attached — total ${formatCurrency(totals.grandTotal)}. Thank you!${business.name ? ` — ${business.name}` : ""}`}
                                />
                                <ClientPrintButton label="Print / Save PDF" />
                            </>
                        )}
                    </div>
                </div>

                {locked && (
                    <div className="print:hidden mb-6 bg-surface-muted border border-border text-text-muted text-xs font-medium rounded-lg px-3 py-2">
                        This invoice has been {invoice.status.toLowerCase()} and is locked from further edits.
                    </div>
                )}
                {isDraft && (
                    <div className="print:hidden mb-6 bg-warning-surface border border-warning-border text-warning text-xs font-medium rounded-lg px-3 py-2">
                        This is an unissued draft — no invoice number has been assigned yet. Preview freely; nothing here is final until you click Issue Invoice.
                    </div>
                )}

                {/* 1. Seller identity — full weight, not muted (unlike the quotation header) */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-4 print:pb-2 print:mb-2 print:break-inside-avoid">
                    <div className="flex items-center gap-3">
                        {business.logoUrl && !logoFailed && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={business.logoUrl}
                                alt={`${business.name} logo`}
                                className="h-12 print:h-8 object-contain"
                                onError={() => setLogoFailed(true)}
                            />
                        )}
                        <div>
                            <div className="font-bold text-xl text-slate-900 print:text-base">{business.name}</div>
                            {business.address && <div className="text-slate-600 text-sm print:text-xs">{business.address}</div>}
                            {business.phone && <div className="text-slate-600 text-sm print:text-xs">{business.phone}</div>}
                        </div>
                    </div>
                    <div className="text-right">
                        {business.gstNumber && <div className="text-slate-900 font-semibold text-sm print:text-xs">GSTIN: {business.gstNumber}</div>}
                    </div>
                </div>

                {/* 2. Document title + number + date */}
                <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2 bg-slate-50 print:bg-transparent print:border print:border-slate-300 rounded-lg p-4 print:p-2 mb-6 print:mb-3 text-sm print:break-inside-avoid">
                    <div className="col-span-2 md:col-span-1">
                        <div className="text-slate-400 text-xs uppercase font-semibold">Document</div>
                        <div className="text-slate-900 font-bold text-lg print:text-sm">TAX INVOICE</div>
                    </div>
                    <div>
                        <div className="text-slate-400 text-xs uppercase font-semibold">Invoice No.</div>
                        <div className="text-slate-800 font-medium">{invoice.invoiceNumber || "—"}</div>
                    </div>
                    <div>
                        <div className="text-slate-400 text-xs uppercase font-semibold">Date</div>
                        <div className="text-slate-800 font-medium">{(invoice.finalizedAt ?? invoice.createdAt) ? new Date(invoice.finalizedAt ?? invoice.createdAt).toLocaleDateString() : "—"}</div>
                    </div>
                    {invoice.quotationNumber && (
                        <div>
                            <div className="text-slate-400 text-xs uppercase font-semibold">Quotation Ref</div>
                            <div className="text-slate-800 font-medium">{invoice.quotationNumber}</div>
                        </div>
                    )}
                </div>

                {/* 3. Bill To — GSTIN at the same weight as the buyer name */}
                <div className="mb-8 print:mb-3 print:break-inside-avoid">
                    <h3 className="text-slate-500 uppercase text-xs font-bold mb-2 print:mb-1">Bill To</h3>
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <span className="text-xl font-semibold text-slate-900 print:text-sm">{invoice.buyerName}</span>
                        {invoice.buyerGstNumber && <span className="text-lg font-semibold text-slate-900 print:text-sm">GSTIN: {invoice.buyerGstNumber}</span>}
                    </div>
                    {invoice.buyerPhone && <div className="text-slate-500 text-sm print:text-xs mt-1">{invoice.buyerPhone}</div>}
                    {invoice.buyerAddress && <div className="text-slate-500 text-sm print:text-xs">{invoice.buyerAddress}</div>}
                </div>

                {/* 4. Line items — matches the sample invoice's exact column set:
                    Description, HSN, Qty/Unit, Rate/Unit, Taxable Amount,
                    Rate of GST%, Amount (CGST+SGST or IGST, stacked), Gross
                    Amount. Description wraps within its column, never
                    truncates, and other cells top-align for a wrapped row. */}
                <div className="mb-8 print:mb-3 border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm print:text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase font-semibold">
                                <th className="p-2 print:p-1">Description</th>
                                <th className="p-2 print:p-1 w-24">HSN Code</th>
                                <th className="p-2 print:p-1 text-right w-20">Qty. Unit</th>
                                <th className="p-2 print:p-1 text-right w-20">Rate/Unit</th>
                                <th className="p-2 print:p-1 text-right w-28">Taxable Amt.</th>
                                <th className="p-2 print:p-1 text-right w-20">GST %</th>
                                <th className="p-2 print:p-1 text-right w-28">Amount</th>
                                <th className="p-2 print:p-1 text-right w-28">Gross Amt.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lines.map((line) => {
                                const rate = line.gstRate ?? invoice.gstRate ?? 0;
                                const lineGst = (line.taxableAmount * rate) / 100;
                                const lineSplit = splitTax(lineGst, taxType);
                                const lineGstTotal = lineSplit.cgst + lineSplit.sgst + lineSplit.igst;
                                return (
                                    <tr key={line.id} className="align-top print:break-inside-avoid">
                                        <td className="p-2 print:p-1 text-slate-800 whitespace-normal break-words">{line.description}</td>
                                        <td className="p-2 print:p-1 text-slate-600">{line.hsnCode || "—"}</td>
                                        <td className="p-2 print:p-1 text-right text-slate-600 whitespace-nowrap">
                                            {line.quantity != null ? `${line.quantity}${line.unit ? ` ${line.unit}` : ""}` : "—"}
                                        </td>
                                        <td className="p-2 print:p-1 text-right text-slate-600 whitespace-nowrap">{line.ratePerUnit != null ? formatCurrency(line.ratePerUnit) : "—"}</td>
                                        <td className="p-2 print:p-1 text-right font-medium text-slate-900 whitespace-nowrap">{formatCurrency(line.taxableAmount)}</td>
                                        <td className="p-2 print:p-1 text-right text-slate-600 whitespace-nowrap">
                                            {taxType === "IGST" ? (
                                                `IGST (${rate.toFixed(0)}%)`
                                            ) : (
                                                <>CGST ({(rate / 2).toFixed(1)}%)<br />SGST ({(rate / 2).toFixed(1)}%)</>
                                            )}
                                        </td>
                                        <td className="p-2 print:p-1 text-right text-slate-700 whitespace-nowrap">
                                            {taxType === "IGST" ? (
                                                formatCurrency(lineSplit.igst)
                                            ) : (
                                                <>{formatCurrency(lineSplit.cgst)}<br />{formatCurrency(lineSplit.sgst)}<br /><span className="font-medium text-slate-900">{formatCurrency(lineGstTotal)}</span></>
                                            )}
                                        </td>
                                        <td className="p-2 print:p-1 text-right font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(line.taxableAmount + lineGstTotal)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* 5. Totals + GST split + amount in words */}
                <div className="flex flex-col md:flex-row justify-between gap-8 print:gap-4 mb-8 print:mb-3 print:break-inside-avoid">
                    <div className="md:max-w-sm">
                        <h3 className="text-slate-500 uppercase text-xs font-bold mb-1">Amount in Words</h3>
                        <p className="text-slate-800 text-sm print:text-xs font-medium">{totals.amountInWords}</p>
                    </div>
                    <div className="w-full md:w-72 space-y-1.5 text-sm print:text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Taxable Amount</span>
                            <span className="text-slate-800 font-medium">{formatCurrency(totals.taxableAmount)}</span>
                        </div>
                        {taxType === "IGST" ? (
                            <div className="flex justify-between">
                                <span className="text-slate-500">IGST</span>
                                <span className="text-slate-800 font-medium">{formatCurrency(totals.igst)}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">CGST</span>
                                    <span className="text-slate-800 font-medium">{formatCurrency(totals.cgst)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">SGST</span>
                                    <span className="text-slate-800 font-medium">{formatCurrency(totals.sgst)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between border-t-2 border-slate-800 pt-2 mt-2">
                            <span className="text-slate-900 font-bold">Grand Total</span>
                            <span className="text-slate-900 font-bold text-lg print:text-sm">{formatCurrency(totals.grandTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* 6. Bank details — each field rendered independently, no all-or-nothing gate */}
                {(business.bankDetails.accountName || business.bankDetails.accountNumber || business.bankDetails.ifsc || business.bankDetails.bankName) && (
                    <div className="mb-8 print:mb-3 border border-slate-200 rounded-lg p-4 print:p-2 print:break-inside-avoid">
                        <h3 className="text-slate-500 uppercase text-xs font-bold mb-2">Bank Details</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm print:text-xs">
                            {business.bankDetails.accountName && (
                                <div><div className="text-slate-400 text-xs">Account Name</div><div className="text-slate-800">{business.bankDetails.accountName}</div></div>
                            )}
                            {business.bankDetails.accountNumber && (
                                <div><div className="text-slate-400 text-xs">Account No.</div><div className="text-slate-800">{business.bankDetails.accountNumber}</div></div>
                            )}
                            {business.bankDetails.ifsc && (
                                <div><div className="text-slate-400 text-xs">IFSC</div><div className="text-slate-800">{business.bankDetails.ifsc}</div></div>
                            )}
                            {business.bankDetails.bankName && (
                                <div><div className="text-slate-400 text-xs">Bank & Branch</div><div className="text-slate-800">{business.bankDetails.bankName}</div></div>
                            )}
                        </div>
                    </div>
                )}

                {/* 7. Signatory */}
                <div className="flex justify-end print:break-inside-avoid">
                    <div className="text-center">
                        <div className="h-16" />
                        <div className="border-t border-slate-300 pt-2 text-sm print:text-xs text-slate-600">For {business.name}</div>
                        <div className="text-xs text-slate-400">Authorized Signatory</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
