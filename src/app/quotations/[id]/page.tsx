"use server";

import Link from "next/link";
import { getQuotation } from "../actions";
import { listCustomers } from "@/app/customers/actions";
import { AREA_SQMM_PER_SQFT } from "@/utils/formatters";
import { splitTax, isQuotationLocked, pricingDataSchema, deriveQuotationTotals, DEFAULT_TAX_TYPE, type PricingData } from "@/utils/quotationPricing";
import { getCompanySnapshot } from "@/utils/companyConfig";
import type { WindowInput } from "@/types";
import QuotationDocument from "./QuotationDocument";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import type { LengthUnit } from "@/utils/units";

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

    // Single source of truth for a field's label — resolved here (not
    // hardcoded on the document) so a renamed field shows its current label
    // on every quotation, past and present.
    const session = await verifySession();
    const customFieldDefinitions = await db.customFieldDefinition.findMany({
        where: { userId: session.userId as string },
        orderBy: { sortOrder: "asc" },
    });

    // Read from the rate card, not the browser, so this quotation prints in
    // the same unit no matter which machine opens or shares it.
    const rateCard = await db.rateCard.findUnique({
        where: { userId: session.userId as string },
        select: { displayLengthUnit: true },
    });
    const displayUnit = (rateCard?.displayLengthUnit as LengthUnit) ?? "mm";

    // Every total comes from the one shared derivation in quotationPricing —
    // this page used to reimplement the subtotal inline while computeTotals
    // sat unused beside it, and the cost sheet needs the identical figures.
    const {
        usesSections,
        subTotal,
        discountAmount,
        profitMargin,
        profitAmount,
        taxRate,
        taxAmount,
        finalTotal,
    } = deriveQuotationTotals(pricing);
    const taxSplit = splitTax(taxAmount, taxType);

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
            customFieldDefinitions={customFieldDefinitions}
            displayUnit={displayUnit}
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
