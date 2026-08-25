"use server";

import Link from "next/link";
import { getQuotation } from "../actions";
import { listCustomers } from "@/app/customers/actions";
import { AREA_SQMM_PER_SQFT } from "@/utils/formatters";
import { splitTax, isQuotationLocked, pricingDataSchema, DEFAULT_TAX_TYPE, type PricingData } from "@/utils/quotationPricing";
import { getCompanySnapshot } from "@/utils/companyConfig";
import type { WindowInput } from "@/types";
import QuotationDocument from "./QuotationDocument";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function QuotationView({ params }: PageProps) {
    const { id } = await params;
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

    // Validated on write (parsePricingData in actions.ts), but read here
    // without re-validation until now — an unvalidated cast on a Json
    // column that every render below assumes has a specific shape. A
    // malformed record should surface a clear message, not crash mid-render.
    const pricingParse = pricingDataSchema.safeParse(quote.pricingData);
    if (!pricingParse.success) {
        return (
            <div className="p-8 text-center">
                <p className="text-danger mb-4">This quotation&apos;s data looks corrupted and can&apos;t be displayed.</p>
                <Link href="/quotations" className="text-primary hover:underline text-sm font-medium">
                    &larr; Back to Quotations
                </Link>
            </div>
        );
    }
    const pricing: PricingData = pricingParse.data;
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

    const business = quote.user ? getCompanySnapshot(quote.user) : getCompanySnapshot({});
    const customersRes = await listCustomers();
    const customers = customersRes.success ? customersRes.data : [];

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

    return (
        <QuotationDocument
            quote={{
                id: quote.id,
                quotationNumber: quote.quotationNumber,
                createdAt: quote.createdAt,
                customerRef: quote.customerRef,
                customerId: quote.customerId,
                clientName: quote.clientName,
                clientPhone: quote.clientPhone,
                clientAddress: quote.clientAddress,
                clientGstNumber: quote.clientGstNumber,
                deliveryAddress: quote.deliveryAddress,
                totalAmount: quote.totalAmount,
                printedAt: quote.printedAt,
                worksheetId: quote.worksheetId,
                status: quote.status,
                userName: quote.user?.name ?? null,
            }}
            customers={customers}
            pricing={pricing}
            taxType={taxType}
            usesSections={usesSections}
            diagramSections={diagramSections}
            business={business}
            locked={locked}
            subTotal={subTotal}
            discountAmount={discountAmount}
            profitMargin={profitMargin}
            profitAmount={profitAmount}
            taxRate={taxRate}
            taxSplit={taxSplit}
            finalTotal={finalTotal}
        />
    );
}
