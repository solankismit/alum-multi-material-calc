"use server";

import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getQuotation } from "../actions";
import { formatCurrency, AREA_SQMM_PER_SQFT } from "@/utils/formatters";
import QuotationPrintButton from "./QuotationPrintButton";
import QuotationHeaderActions from "./QuotationHeaderActions";
import QuotationStatusActions from "./QuotationStatusActions";
import WindowSchematic from "@/components/WindowSchematic";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import PrintStyles from "@/components/PrintStyles";
import { Eye, EyeOff } from "lucide-react";
import { splitTax, isQuotationLocked, DEFAULT_TAX_TYPE, type PricingData } from "@/utils/quotationPricing";
import type { WindowInput } from "@/types";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ view?: string }>;
}

const DEFAULT_TERMS = "Payment terms: 50% advance, balance upon completion.\nValid for 30 days from date of issue.";

export default async function QuotationView({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { view } = await searchParams;
    const isInternal = view === "internal";
    const res = await getQuotation(id);

    if (!res.success || !res.data) {
        return (
            <div className="p-8 text-center">
                <p className="text-danger mb-4">{res.error || "Quotation not found"}</p>
                <Link href="/quotations" className="text-primary hover:underline text-sm font-medium">
                    &larr; Back to Quotations
                </Link>
            </div>
        );
    }

    const quote = res.data;
    const locked = isQuotationLocked(quote);
    const pricing = quote.pricingData as unknown as PricingData;
    const taxType = pricing.taxType ?? DEFAULT_TAX_TYPE;

    // Quotations saved after the per-section pricing change carry `pricing.sections`
    // (one cost breakdown per window type). Older / freeform quotations keep the
    // original flat `profiles`/`glass`/`accessories` arrays — both render correctly.
    const usesSections = Array.isArray(pricing.sections) && pricing.sections.length > 0;

    let profilesTotal = 0;
    let glassTotal = 0;
    let accessoriesTotal = 0;
    if (usesSections) {
        pricing.sections!.forEach((section) => {
            profilesTotal += section.profiles.reduce((acc, curr) => acc + curr.cost, 0);
            glassTotal += section.glass.reduce((acc, curr) => acc + curr.cost, 0);
            accessoriesTotal += section.accessories.reduce((acc, curr) => acc + curr.cost, 0);
        });
    } else {
        profilesTotal = pricing.profiles.reduce((acc, curr) => acc + curr.cost, 0);
        glassTotal = pricing.glass.reduce((acc, curr) => acc + curr.cost, 0);
        accessoriesTotal = pricing.accessories.reduce((acc, curr) => acc + curr.cost, 0);
    }
    const materialCost = profilesTotal + glassTotal + accessoriesTotal;

    // Installation/transportation amounts only count toward the subtotal when
    // explicitly marked included — same rule as `computeTotals` in
    // quotationPricing.ts. Discount is trusted from the persisted `amount`
    // (set once at save time) rather than recomputed from `value`, since a
    // percent discount's amount depends on the subtotal at save time.
    const installationAmount = pricing.installation?.included ? (pricing.installation.amount || 0) : 0;
    const transportationAmount = pricing.transportation?.included ? (pricing.transportation.amount || 0) : 0;
    const subTotal = materialCost + (pricing.labor || 0) + (pricing.overhead || 0) + installationAmount + transportationAmount;
    const discountAmount = pricing.discount?.amount || 0;
    const discountedSubtotal = Math.max(0, subTotal - discountAmount);
    const profitMargin = pricing.profitMargin || 0;
    const taxRate = pricing.taxRate || 0;
    const profitAmount = discountedSubtotal * (profitMargin / 100);
    const taxAmount = (discountedSubtotal + profitAmount) * (taxRate / 100);
    const taxSplit = splitTax(taxAmount, taxType);
    const finalTotal = discountedSubtotal + profitAmount + taxAmount;

    const business = {
        name: quote.user?.company || quote.user?.name || "Your Company",
        address: quote.user?.businessAddress,
        phone: quote.user?.businessPhone,
        gst: quote.user?.gstNumber,
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
        const areaSqFt = section.dimensions?.reduce(
            (sum, d) => sum + ((d.width || 0) * (d.height || 0) * (d.quantity || 0)) / AREA_SQMM_PER_SQFT,
            0
        ) || 0;
        return {
            id: section.id,
            name: section.name,
            trackType: isOpenable ? "openable" : section.trackType,
            configuration: section.configuration,
            panels: isOpenable ? (panels as number) : 2,
            qty,
            areaSqFt,
            widthMm: firstDim?.width || undefined,
            heightMm: firstDim?.height || undefined,
        };
    });

    const showLaborRow = (pricing.labor ?? 0) > 0;
    const showOverheadRow = isInternal && (pricing.overhead ?? 0) > 0;
    const showInstallationRow = !!pricing.installation;
    const showTransportationRow = !!pricing.transportation;
    const showExtraCostsRow = showLaborRow || showOverheadRow || showInstallationRow || showTransportationRow;

    return (
        <div className="min-h-screen bg-surface-muted p-8 print:p-0 print:bg-white">
            <PrintStyles />
            <div className="max-w-4xl mx-auto print:hidden mb-3 flex items-center justify-between">
                <Breadcrumbs
                    items={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Quotations", href: "/quotations" },
                        { label: quote.quotationNumber || "Quotation" },
                    ]}
                />
                <Link
                    href={isInternal ? `/quotations/${quote.id}` : `/quotations/${quote.id}?view=internal`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-md px-2.5 py-1.5"
                >
                    {isInternal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isInternal ? "Viewing Internal Cost Sheet — switch to Customer View" : "View Internal Cost Sheet"}
                </Link>
            </div>
            <div className="max-w-4xl mx-auto bg-surface shadow-lg print:shadow-none p-8 md:p-12 print:p-0 text-sm print:text-[11px]" id="printable-area">

                {/* Header Actions (Hidden continuously in print) */}
                <div className="print:hidden flex justify-between items-center mb-8">
                    <QuotationHeaderActions id={quote.id} worksheetId={quote.worksheetId} locked={locked} />
                    <div className="flex items-center gap-3">
                        <QuotationStatusActions id={quote.id} status={quote.status} />
                        <QuotationPrintButton id={quote.id} label="Print / Save PDF" />
                        <WhatsAppShareButton
                            elementId="printable-area"
                            filename={`Quotation-${quote.quotationNumber}.pdf`}
                            phone={quote.clientPhone}
                            message={`Hi ${quote.clientName || "there"}, please find your quotation ${quote.quotationNumber} attached — total ${formatCurrency(quote.totalAmount ?? finalTotal)}. Thank you!${business.name ? ` — ${business.name}` : ""}`}
                        />
                    </div>
                </div>

                {locked && (
                    <div className="print:hidden mb-6 bg-surface-muted border border-border text-text-muted text-xs font-medium rounded-lg px-3 py-2">
                        This quotation has been {quote.printedAt ? "printed" : "sent"} and can no longer be edited directly — use Duplicate to make changes.
                    </div>
                )}

                {isInternal && (
                    <div className="print:hidden mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-lg px-3 py-2">
                        Internal Cost Sheet — includes profit margin and itemized costs. Do not send this version to the customer.
                    </div>
                )}

                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-6 print:pb-2 print:mb-3 print:break-inside-avoid">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2 print:text-2xl print:mb-1">QUOTATION</h1>
                        <p className="text-slate-500">#{quote.quotationNumber}</p>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-xl text-slate-800 print:text-base">{business.name}</div>
                        {business.address && <div className="text-slate-500 text-sm print:text-xs">{business.address}</div>}
                        {business.phone && <div className="text-slate-500 text-sm print:text-xs">{business.phone}</div>}
                        {business.gst && <div className="text-slate-500 text-sm print:text-xs">GST: {business.gst}</div>}
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
                        <div className="text-slate-800 font-medium">{quote.user?.name || "—"}</div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:gap-3 mb-12 print:mb-4 print:break-inside-avoid">
                    <div>
                        <h3 className="text-slate-500 uppercase text-xs font-bold mb-2 print:mb-1">To</h3>
                        <div className="text-xl font-semibold text-slate-800 print:text-sm">{quote.clientName || "Valued Client"}</div>
                        {quote.clientPhone && <div className="text-slate-500 text-sm print:text-xs mt-1">{quote.clientPhone}</div>}
                        {quote.clientAddress && <div className="text-slate-500 text-sm print:text-xs">{quote.clientAddress}</div>}
                    </div>
                    {/* Only shown when there's an actual delivery address distinct from — or in addition to — the client address above. */}
                    {quote.deliveryAddress && quote.deliveryAddress !== quote.clientAddress && (
                        <div>
                            <h3 className="text-slate-500 uppercase text-xs font-bold mb-2 print:mb-1">Deliver To</h3>
                            <div className="text-slate-700 text-sm print:text-xs">{quote.deliveryAddress}</div>
                        </div>
                    )}
                </div>

                {usesSections ? (
                    /* Row-wise: one table row per window type — diagram, spec, and its own cost breakdown */
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
                                    const meshLine = section.accessories.find((a) => a.area);
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
                                                {section.details && (
                                                    <div className="mt-1.5 mb-1.5 bg-slate-50 print:bg-transparent border border-slate-200 rounded-md px-2.5 py-1.5">
                                                        <div className="text-[10px] print:text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Specification</div>
                                                        <table className="text-xs print:text-[10px] w-full">
                                                            <tbody className="divide-y divide-slate-200/70">
                                                                {([
                                                                    ["Profile Brand", section.details.profileBrand],
                                                                    ["Series", section.details.series],
                                                                    ["Glass", section.details.glassSpec],
                                                                    ["Profile Color", section.details.profileColor],
                                                                    ["Bug Mesh", section.details.meshGrade],
                                                                    ["Mesh Handle", section.details.meshHandle],
                                                                    ["Locking", section.details.locking],
                                                                    ["Handle Color", section.details.handleColor],
                                                                    ["Hinge", section.details.hinge],
                                                                    ["Notes", section.details.notes],
                                                                ] as const).filter(([, value]) => !!value).map(([label, value]) => (
                                                                    <tr key={label}>
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
                        {/* Window Diagrams */}
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

                        {/* Itemized Table */}
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
