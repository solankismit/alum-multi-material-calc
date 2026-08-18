import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { getOwnedWorksheet } from "@/lib/data-fetchers";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { getQuotation } from "../actions";
import { isQuotationLocked, type PricingData } from "@/utils/quotationPricing";
import QuotationBuilder, { type RateCardData, type InitialQuotation } from "./QuotationBuilder";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Copy } from "lucide-react";

export default async function CreateQuotationPage({
    searchParams,
}: {
    searchParams: Promise<{ worksheetId?: string; editId?: string }>;
}) {
    const session = await verifySession();
    const { worksheetId: worksheetIdParam, editId } = await searchParams;

    let initialQuotation: InitialQuotation | null = null;
    let effectiveWorksheetId = worksheetIdParam ?? null;

    if (editId) {
        const res = await getQuotation(editId);
        if (!res.success || !res.data) {
            return <AccessDenied message="Quotation not found." backHref="/quotations" backLabel="Back to Quotations" />;
        }
        const quotation = res.data;
        if (isQuotationLocked(quotation)) {
            return (
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
                    <p className="text-text-muted max-w-sm">
                        This quotation has already been sent or printed and can no longer be edited directly.
                        Duplicate it from the quotation page to make changes.
                    </p>
                    <Link href={`/quotations/${editId}`}>
                        <Button variant="outline">
                            <Copy className="w-4 h-4 mr-2" />
                            Go to Quotation
                        </Button>
                    </Link>
                </div>
            );
        }

        effectiveWorksheetId = quotation.worksheetId ?? null;
        initialQuotation = {
            id: quotation.id,
            pricingData: quotation.pricingData as unknown as PricingData,
            clientName: quotation.clientName ?? "",
            clientPhone: quotation.clientPhone ?? "",
            clientAddress: quotation.clientAddress ?? "",
            deliveryAddress: quotation.deliveryAddress ?? "",
            customerRef: quotation.customerRef ?? "",
        };
    }

    const rateCardRow = await db.rateCard.findUnique({ where: { userId: session.userId as string } });
    const initialRateCard: RateCardData | null = rateCardRow
        ? {
            profileRatePerFt: rateCardRow.profileRatePerFt,
            profileRates: (rateCardRow.profileRates as Record<string, number>) ?? {},
            glassRates: (rateCardRow.glassRates as Record<string, number>) ?? {},
            hardwareRates: (rateCardRow.hardwareRates as Record<string, number>) ?? {},
            laborMode: rateCardRow.laborMode as RateCardData["laborMode"],
            laborDefault: rateCardRow.laborDefault,
            laborPercent: rateCardRow.laborPercent,
            laborRatePerSqft: rateCardRow.laborRatePerSqft,
            overheadDefault: rateCardRow.overheadDefault,
            profitMarginDefault: rateCardRow.profitMarginDefault,
            taxRateDefault: rateCardRow.taxRateDefault,
            termsText: rateCardRow.termsText,
        }
        : null;

    let initialWorksheet = null;
    if (effectiveWorksheetId) {
        const owned = await getOwnedWorksheet(effectiveWorksheetId);
        if (owned.forbidden) {
            return <AccessDenied message="You do not have permission to use this worksheet." />;
        }
        initialWorksheet = owned.data;
    }

    return (
        <QuotationBuilder
            worksheetId={effectiveWorksheetId}
            initialRateCard={initialRateCard}
            initialWorksheet={initialWorksheet}
            initialQuotation={initialQuotation}
        />
    );
}
