"use client";

import { useRef, useState } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { formatCurrency } from "@/utils/formatters";
import QuotationPrintButton from "./QuotationPrintButton";
import QuotationHeaderActions from "./QuotationHeaderActions";
import QuotationStatusActions from "./QuotationStatusActions";
import WindowSchematic from "@/components/WindowSchematic";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { useSharePdf } from "@/hooks/useSharePdf";
import PrintStyles from "@/components/PrintStyles";
import EditClientDetailsButton from "./EditClientDetailsButton";
import { Eye, EyeOff } from "lucide-react";
import type { ItemSpecDetails, PricingData } from "@/utils/quotationPricing";
import type { CompanySnapshot } from "@/utils/companyConfig";
import type { QuotationStatus } from "@prisma/client";
import type { CustomFieldDefinitionData } from "@/utils/customFields";

const DEFAULT_TERMS = "Payment terms: 50% advance, balance upon completion.\nValid for 30 days from date of issue.";

/** Resolves each detail value to its definition's current label — single
 * source of truth for the label (settings), not a second hardcoded copy on
 * the print document. Falls back to the raw key for any value whose
 * definition no longer exists at all, so data is never silently hidden. */
function buildDetailRows(details: ItemSpecDetails, definitions: CustomFieldDefinitionData[]) {
    const byKey = new Map(definitions.map((d) => [d.key, d]));
    return Object.entries(details)
        .filter(([, value]) => !!value)
        .sort(([keyA], [keyB]) => (byKey.get(keyA)?.sortOrder ?? 999) - (byKey.get(keyB)?.sortOrder ?? 999))
        .map(([key, value]) => ({ key, label: byKey.get(key)?.label ?? key, value }));
}

interface DiagramSection {
    id: string;
    name: string;
    trackType: string;
    configuration: string;
    panels: number;
    qty: number;
    areaSqFt: number;
    widthMm?: number;
    heightMm?: number;
}

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    gstNumber: string | null;
}

interface QuotationDocumentProps {
    quote: {
        id: string;
        quotationNumber: string | null;
        createdAt: Date;
        customerRef: string | null;
        customerId: string | null;
        clientName: string | null;
        clientPhone: string | null;
        clientAddress: string | null;
        clientGstNumber: string | null;
        deliveryAddress: string | null;
        totalAmount: number | null;
        printedAt: Date | null;
        worksheetId: string | null;
        status: QuotationStatus;
        userName: string | null;
    };
    customers: Customer[];
    pricing: PricingData;
    taxType: "CGST_SGST" | "IGST";
    usesSections: boolean;
    diagramSections: DiagramSection[];
    business: CompanySnapshot;
    locked: boolean;
    subTotal: number;
    discountAmount: number;
    profitMargin: number;
    profitAmount: number;
    taxRate: number;
    taxSplit: { igst: number; cgst: number; sgst: number };
    finalTotal: number;
    customFieldDefinitions: CustomFieldDefinitionData[];
}

/**
 * The customer/internal cost-sheet toggle used to be a `?view=internal` URL
 * param — a server-rendered link that made the internal (profit-margin
 * exposing) view a plain shareable URL, with no safeguard against a copied
 * link leaking margin to a customer. Moving it to local component state
 * means the toggle never touches the URL: it resets to the safe default
 * every time this page loads, and there is no link a user could
 * accidentally forward that opens straight into the internal view.
 */
export default function QuotationDocument({
    quote,
    customers,
    pricing,
    taxType,
    usesSections,
    diagramSections,
    business,
    locked,
    subTotal,
    discountAmount,
    profitMargin,
    profitAmount,
    taxRate,
    taxSplit,
    finalTotal,
    customFieldDefinitions,
}: QuotationDocumentProps) {
    const [isInternal, setIsInternal] = useState(false);

    const [logoFailed, setLogoFailed] = useState(false);

    const printableRef = useRef<HTMLDivElement>(null);
    const sharePdfFile = useSharePdf(printableRef, `Quotation-${quote.quotationNumber}.pdf`);

    const showLaborRow = (pricing.labor ?? 0) > 0;
    const showOverheadRow = isInternal && (pricing.overhead ?? 0) > 0;
    const showInstallationRow = !!pricing.installation;
    const showTransportationRow = !!pricing.transportation;
    const showExtraCostsRow = showLaborRow || showOverheadRow || showInstallationRow || showTransportationRow;

    return (
        <div className="min-h-screen bg-surface-muted px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:bg-white">
            <PrintStyles />
            <div className="max-w-7xl mx-auto print:hidden mb-3 flex items-center justify-between">
                <Breadcrumbs
                    items={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Quotations", href: "/quotations" },
                        { label: quote.quotationNumber || "Quotation" },
                    ]}
                />
                <button
                    type="button"
                    onClick={() => setIsInternal((v) => !v)}
                    aria-pressed={isInternal}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text border border-border rounded-md px-2.5 py-1.5"
                >
                    {isInternal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isInternal ? "Viewing Internal Cost Sheet — switch to Customer View" : "View Internal Cost Sheet"}
                </button>
            </div>
            {/* Screen width matches the header's max-w-7xl; print keeps the
                original max-w-4xl so the printed page is unaffected by
                whatever width the screen happened to be shown at. */}
            <div ref={printableRef} className="max-w-7xl print:max-w-4xl mx-auto bg-surface shadow-lg print:shadow-none p-8 md:p-12 print:p-0 text-sm print:text-[11px]" id="printable-area">

                {/* Header Actions (Hidden continuously in print) — stacks on
                    narrow screens and groups by kind (navigate/edit, status,
                    export) with the one primary action, Print, called out
                    instead of every button carrying the same outline weight. */}
                <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-8">
                    <QuotationHeaderActions id={quote.id} worksheetId={quote.worksheetId} locked={locked} />
                    <div className="flex flex-wrap items-center gap-2">
                        <QuotationStatusActions id={quote.id} status={quote.status} />
                        <div className="h-6 w-px bg-border mx-1 hidden sm:block" aria-hidden="true" />
                        <WhatsAppShareButton
                            file={sharePdfFile}
                            message={`Hi ${quote.clientName || "there"}, please find your quotation ${quote.quotationNumber} attached — total ${formatCurrency(quote.totalAmount ?? finalTotal)}. Thank you!${business.name ? ` — ${business.name}` : ""}`}
                        />
                        <QuotationPrintButton id={quote.id} label="Print / Save PDF" />
                    </div>
                </div>

                {locked && (
                    <div className="print:hidden mb-6 bg-surface-muted border border-border text-text-muted text-xs font-medium rounded-lg px-3 py-2">
                        This quotation has been {quote.printedAt ? "printed" : "sent"} and can no longer be edited directly — use Duplicate to make changes.
                    </div>
                )}

                {isInternal && (
                    <div className="print:hidden mb-6 bg-warning-surface border border-warning-border text-warning text-xs font-medium rounded-lg px-3 py-2">
                        Internal Cost Sheet — includes profit margin and itemized costs. Do not send this version to the customer. This view resets every time the page loads and is never part of the URL.
                    </div>
                )}

                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-6 print:pb-2 print:mb-3 print:break-inside-avoid">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2 print:text-2xl print:mb-1">QUOTATION</h1>
                        <p className="text-slate-500">#{quote.quotationNumber}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
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
                            <div className="font-bold text-xl text-slate-800 print:text-base">{business.name}</div>
                            {business.address && <div className="text-slate-500 text-sm print:text-xs">{business.address}</div>}
                            {business.phone && <div className="text-slate-500 text-sm print:text-xs">{business.phone}</div>}
                            {business.gstNumber && <div className="text-slate-500 text-sm print:text-xs">GST: {business.gstNumber}</div>}
                        </div>
                    </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2 bg-slate-50 print:bg-transparent print:border print:border-slate-300 rounded-lg p-4 print:p-2 mb-8 print:mb-3 text-sm print:break-inside-avoid">
                    <div>
                        <div className="text-slate-400 text-xs uppercase font-semibold">Quote No.</div>
                        <div className="text-slate-800 font-medium">{quote.quotationNumber}</div>
                    </div>
                    <div>
                        <div className="text-slate-400 text-xs uppercase font-semibold">Date</div>
                        <div className="text-slate-800 font-medium">{new Date(quote.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div className="text-slate-400 text-xs uppercase font-semibold">Customer Ref</div>
                        <div className="text-slate-800 font-medium">{quote.customerRef || "—"}</div>
                    </div>
                    <div>
                        <div className="text-slate-400 text-xs uppercase font-semibold">Responsible</div>
                        <div className="text-slate-800 font-medium">{quote.userName || "—"}</div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:gap-3 mb-12 print:mb-4 print:break-inside-avoid">
                    <div>
                        <div className="flex items-center justify-between mb-2 print:mb-1">
                            <h3 className="text-slate-500 uppercase text-xs font-bold">To</h3>
                            <EditClientDetailsButton
                                quotationId={quote.id}
                                customers={customers}
                                initial={{
                                    customerId: quote.customerId,
                                    clientName: quote.clientName,
                                    clientPhone: quote.clientPhone,
                                    clientAddress: quote.clientAddress,
                                    clientGstNumber: quote.clientGstNumber,
                                    deliveryAddress: quote.deliveryAddress,
                                    customerRef: quote.customerRef,
                                }}
                            />
                        </div>
                        <div className="text-xl font-semibold text-slate-800 print:text-sm">{quote.clientName || "Valued Client"}</div>
                        {quote.clientPhone && <div className="text-slate-500 text-sm print:text-xs mt-1">{quote.clientPhone}</div>}
                        {quote.clientAddress && <div className="text-slate-500 text-sm print:text-xs">{quote.clientAddress}</div>}
                        {quote.clientGstNumber && <div className="text-slate-500 text-sm print:text-xs">GST: {quote.clientGstNumber}</div>}
                    </div>
                    {quote.deliveryAddress && quote.deliveryAddress !== quote.clientAddress && (
                        <div>
                            <h3 className="text-slate-500 uppercase text-xs font-bold mb-2 print:mb-1">Deliver To</h3>
                            <div className="text-slate-700 text-sm print:text-xs">{quote.deliveryAddress}</div>
                        </div>
                    )}
                </div>

                {usesSections ? (
                    <div className="mb-8 print:mb-3 border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm print:text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-left text-slate-500 text-xs uppercase font-semibold">
                                    <th className="p-2 print:p-1 w-44">Drawing</th>
                                    <th className="p-2 print:p-1">Description</th>
                                    <th className="p-2 print:p-1 text-right w-24">Rate</th>
                                    <th className="p-2 print:p-1 text-right w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pricing.sections!.map((section) => {
                                    const effectiveRate = section.areaSqFt > 0 ? section.subtotal / section.areaSqFt : 0;
                                    const allLines = [...section.profiles, ...section.glass, ...section.accessories];
                                    const includedLines = allLines.filter((line) => line.cost > 0 || line.quantity || line.area);
                                    const glassLine = section.glass[0];
                                    const meshLine = section.accessories.find((a) => a.area && a.name.toLowerCase().includes("mesh"));
                                    return (
                                        <tr key={section.sectionId} className="align-top print:break-inside-avoid">
                                            <td className="p-2 print:p-1 w-44">
                                                {section.position?.label && (
                                                    <div className="text-slate-700 text-xs print:text-[10px] font-semibold mb-1 text-center">
                                                        {section.position.label}
                                                    </div>
                                                )}
                                                <div className="w-40 print:w-36">
                                                    <WindowSchematic
                                                        trackType={section.trackType}
                                                        configuration={section.configuration}
                                                        sections={section.panels}
                                                        widthMm={section.widthMm}
                                                        heightMm={section.heightMm}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-2 print:p-1">
                                                <div className="font-semibold text-slate-800">
                                                    {section.sectionName}{section.qty > 1 ? ` × ${section.qty}` : ""}
                                                </div>
                                                <div className="text-slate-500 text-xs print:text-[10px]">
                                                    {section.configLabel ? `${section.configLabel} — ` : (section.sectionTypeName ? `${section.sectionTypeName} — ` : "")}
                                                    {((section.widthMm ?? 0) > 0 || (section.heightMm ?? 0) > 0) && `${Math.round(section.widthMm || 0)} × ${Math.round(section.heightMm || 0)} mm — `}
                                                    {section.areaSqFt.toFixed(2)} sq.ft
                                                    {isInternal && typeof section.materialWastagePercent === "number" && ` — ${section.materialWastagePercent.toFixed(1)}% wastage`}
                                                </div>
                                                {section.details && Object.keys(section.details).length > 0 && (
                                                    <div className="mt-1.5 mb-1.5 bg-slate-50 print:bg-transparent border border-slate-200 rounded-md px-2.5 py-1.5">
                                                        <div className="text-[10px] print:text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Specification</div>
                                                        <table className="text-xs print:text-[10px] w-full">
                                                            <tbody className="divide-y divide-slate-200/70">
                                                                {buildDetailRows(section.details, customFieldDefinitions).map(({ key, label, value }) => (
                                                                    <tr key={key}>
                                                                        <td className="pr-3 py-0.5 font-medium text-slate-500 whitespace-nowrap align-top w-28">{label}</td>
                                                                        <td className="py-0.5 text-slate-700 align-top">{value}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                                {isInternal ? (
                                                    <div className={`flex flex-wrap gap-x-3 gap-y-0.5 text-slate-500 text-xs print:text-[10px] mt-1 ${section.details ? "pt-1 border-t border-slate-100" : ""}`}>
                                                        {allLines.filter((line) => line.cost > 0).map((line, idx) => (
                                                            <span key={idx} className="whitespace-nowrap">{line.name}: {formatCurrency(line.cost)}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    includedLines.length > 0 && (
                                                        <div className={`text-slate-500 text-xs print:text-[10px] mt-1 ${section.details ? "pt-1 border-t border-slate-100" : ""}`}>
                                                            Includes: {includedLines.map((line) => line.name).join(", ")}
                                                        </div>
                                                    )
                                                )}
                                                {isInternal && (glassLine?.widthMm || meshLine?.area) && (
                                                    <div className="text-slate-400 text-[10px] mt-0.5">
                                                        {glassLine?.widthMm ? `Glass pane: ${Math.round(glassLine.widthMm)} × ${Math.round(glassLine.heightMm || 0)} mm — ` : ""}
                                                        {meshLine?.area ? `Mesh: ${meshLine.area.toFixed(2)} sq.ft` : ""}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2 print:p-1 text-right text-slate-400 text-xs print:text-[10px] whitespace-nowrap">
                                                {effectiveRate > 0 ? `${formatCurrency(effectiveRate)}/sq.ft` : "—"}
                                            </td>
                                            <td className="p-2 print:p-1 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(section.subtotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <>
                        {diagramSections.length > 0 && (
                            <div className="mb-12 print:mb-4">
                                <h3 className="text-slate-500 uppercase text-xs font-bold mb-4 print:mb-2">Window Diagrams</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-4 print:gap-2">
                                    {diagramSections.map((section) => (
                                        <div key={section.id} className="border border-slate-200 rounded-lg p-3 print:p-1.5 print:break-inside-avoid">
                                            <WindowSchematic
                                                trackType={section.trackType}
                                                configuration={section.configuration}
                                                sections={section.panels}
                                                widthMm={section.widthMm}
                                                heightMm={section.heightMm}
                                            />
                                            <p className="text-xs font-semibold text-slate-700 mt-2 print:mt-1 text-center">
                                                {section.name}{section.qty > 1 ? ` × ${section.qty}` : ""}
                                            </p>
                                            {((section.widthMm ?? 0) > 0 || (section.heightMm ?? 0) > 0) && (
                                                <p className="text-[11px] text-slate-600 font-medium text-center">{Math.round(section.widthMm || 0)} × {Math.round(section.heightMm || 0)} mm</p>
                                            )}
                                            {section.areaSqFt > 0 && (
                                                <p className="text-[11px] text-slate-400 text-center">{section.areaSqFt.toFixed(1)} sq.ft total</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <table className="w-full mb-8 print:mb-3">
                            <thead>
                                <tr className="border-b border-slate-200 text-left">
                                    <th className="py-3 print:py-1 font-semibold text-slate-600">Description</th>
                                    <th className="py-3 print:py-1 font-semibold text-slate-600 text-right">Quantity</th>
                                    <th className="py-3 print:py-1 font-semibold text-slate-600 text-right">Rate</th>
                                    <th className="py-3 print:py-1 font-semibold text-slate-600 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {pricing.profiles.map((p, idx) => (
                                    <tr key={`p-${idx}`}>
                                        <td className="py-3 print:py-1">{p.name} (Aluminium Profile)</td>
                                        <td className="py-3 print:py-1 text-right">{(p.quantity ?? 0).toFixed(2)} {p.unit}</td>
                                        <td className="py-3 print:py-1 text-right">{formatCurrency(p.rate)}</td>
                                        <td className="py-3 print:py-1 text-right font-medium">{formatCurrency(p.cost)}</td>
                                    </tr>
                                ))}
                                {pricing.glass.map((g, idx) => (
                                    <tr key={`g-${idx}`}>
                                        <td className="py-3 print:py-1">{g.name}</td>
                                        <td className="py-3 print:py-1 text-right">{(g.area ?? 0).toFixed(2)} {g.unit}</td>
                                        <td className="py-3 print:py-1 text-right">{formatCurrency(g.rate)}</td>
                                        <td className="py-3 print:py-1 text-right font-medium">{formatCurrency(g.cost)}</td>
                                    </tr>
                                ))}
                                {pricing.accessories.filter((a) => a.cost > 0).map((a, idx) => (
                                    <tr key={`a-${idx}`}>
                                        <td className="py-3 print:py-1">{a.name}</td>
                                        <td className="py-3 print:py-1 text-right">{(a.quantity ?? 0).toFixed(2)} {a.unit}</td>
                                        <td className="py-3 print:py-1 text-right">{formatCurrency(a.rate)}</td>
                                        <td className="py-3 print:py-1 text-right font-medium">{formatCurrency(a.cost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {showExtraCostsRow && (
                    <div className="flex flex-wrap justify-end gap-x-8 gap-y-1 text-sm print:text-xs text-slate-600 -mt-6 mb-8 print:mb-3 print:-mt-2 pb-2 border-b border-slate-100">
                        {showLaborRow && (
                            <span>
                                Labour: {formatCurrency(pricing.labor || 0)}
                                {isInternal && pricing.laborBreakdown?.mode === "itemized" && pricing.laborBreakdown.items.length > 0 && (
                                    <span className="text-slate-400"> ({pricing.laborBreakdown.items.map((i) => `${i.name}: ${formatCurrency(i.amount)}`).join(", ")})</span>
                                )}
                            </span>
                        )}
                        {showOverheadRow && <span>Overhead: {formatCurrency(pricing.overhead || 0)}</span>}
                        {showInstallationRow && (
                            <span>
                                Installation: {pricing.installation!.included
                                    ? (isInternal ? formatCurrency(pricing.installation!.amount) : "Included")
                                    : "Not included"}
                                {pricing.installation!.note ? ` — ${pricing.installation!.note}` : ""}
                            </span>
                        )}
                        {showTransportationRow && (
                            <span>
                                Transportation: {pricing.transportation!.included
                                    ? (isInternal ? formatCurrency(pricing.transportation!.amount) : "Included")
                                    : "Not included"}
                                {pricing.transportation!.note ? ` — ${pricing.transportation!.note}` : ""}
                            </span>
                        )}
                    </div>
                )}

                {/* Totals */}
                <div className="flex justify-end print:break-inside-avoid">
                    <div className="w-1/2 space-y-3 print:space-y-1">
                        <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subTotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-amber-600">
                                <span>Discount {pricing.discount?.type === "percent" ? `(${pricing.discount.value}%)` : ""}</span>
                                <span>- {formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        {isInternal && profitMargin > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Profit ({profitMargin}%)</span>
                                <span>{formatCurrency(profitAmount)}</span>
                            </div>
                        )}
                        {taxType === "IGST" ? (
                            <div className="flex justify-between text-slate-600">
                                <span>IGST ({taxRate}%)</span>
                                <span>{formatCurrency(taxSplit.igst)}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between text-slate-600">
                                    <span>CGST ({(taxRate / 2).toFixed(2)}%)</span>
                                    <span>{formatCurrency(taxSplit.cgst)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>SGST ({(taxRate / 2).toFixed(2)}%)</span>
                                    <span>{formatCurrency(taxSplit.sgst)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between text-2xl print:text-lg font-bold text-slate-900 border-t-2 border-slate-900 pt-3 print:pt-1 mt-3 print:mt-1">
                            <span>Total</span>
                            <span>{formatCurrency(quote.totalAmount ?? finalTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer terms */}
                <div className="mt-16 print:mt-4 pt-8 print:pt-2 border-t border-slate-200 text-slate-500 text-sm print:text-xs print:break-inside-avoid">
                    <p className="font-bold mb-2 print:mb-1">Terms & Conditions</p>
                    <ul className="list-disc pl-5 space-y-1 print:space-y-0">
                        {(pricing.termsText || DEFAULT_TERMS).split("\n").filter(Boolean).map((line, idx) => (
                            <li key={idx}>{line}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
