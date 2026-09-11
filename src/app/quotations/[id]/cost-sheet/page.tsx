"use server";

import Link from "next/link";
import { getQuotation } from "../../actions";
import { pricingDataSchema, DEFAULT_TAX_TYPE, type PricingData } from "@/utils/quotationPricing";
import { getCompanySnapshot } from "@/utils/companyConfig";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import type { LengthUnit } from "@/utils/units";
import CostSheetDocument from "./CostSheetDocument";

interface PageProps {
    params: Promise<{ id: string }>;
}

/**
 * The internal cost sheet for a quotation.
 *
 * A separate route from the quotation view on purpose — see the comment on
 * CostSheetDocument. In short: printing must not lock the quotation, and cost
 * content must not be reachable by the html2canvas snapshot that produces the
 * customer's shared PDF.
 *
 * Note there is no `isQuotationLocked` gate here: a locked quotation is one
 * that can no longer be *edited*, but its costs are still worth reading.
 */
export default async function CostSheetPage({ params }: PageProps) {
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

    const pricingParse = pricingDataSchema.safeParse(quote.pricingData);
    if (!pricingParse.success) {
        return (
            <div className="p-8 text-center">
                <p className="text-danger mb-4">
                    This quotation&apos;s data looks corrupted and can&apos;t be displayed.
                </p>
                <Link href={`/quotations/${id}`} className="text-primary hover:underline text-sm font-medium">
                    &larr; Back to Quotation
                </Link>
            </div>
        );
    }
    const pricing: PricingData = pricingParse.data;

    const session = await verifySession();
    const rateCard = await db.rateCard.findUnique({
        where: { userId: session.userId as string },
        select: { displayLengthUnit: true },
    });

    return (
        <CostSheetDocument
            quote={{
                id: quote.id,
                quotationNumber: quote.quotationNumber,
                createdAt: quote.createdAt,
                clientName: quote.clientName,
                customerRef: quote.customerRef,
            }}
            pricing={pricing}
            business={quote.user ? getCompanySnapshot(quote.user) : getCompanySnapshot({})}
            taxType={pricing.taxType ?? DEFAULT_TAX_TYPE}
            displayUnit={(rateCard?.displayLengthUnit as LengthUnit) ?? "mm"}
        />
    );
}
