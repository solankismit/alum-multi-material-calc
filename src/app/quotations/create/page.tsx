import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { getOwnedWorksheet } from "@/lib/data-fetchers";
import { AccessDenied } from "@/components/layout/AccessDenied";
import QuotationBuilder, { type RateCardData } from "./QuotationBuilder";

export default async function CreateQuotationPage({
    searchParams,
}: {
    searchParams: Promise<{ worksheetId?: string }>;
}) {
    const session = await verifySession();
    const { worksheetId } = await searchParams;

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
    if (worksheetId) {
        const owned = await getOwnedWorksheet(worksheetId);
        if (owned.forbidden) {
            return <AccessDenied message="You do not have permission to use this worksheet." />;
        }
        initialWorksheet = owned.data;
    }

    return (
        <QuotationBuilder
            worksheetId={worksheetId ?? null}
            initialRateCard={initialRateCard}
            initialWorksheet={initialWorksheet}
        />
    );
}
