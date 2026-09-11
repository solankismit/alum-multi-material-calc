import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RateCardForm from "./RateCardForm";
import { PageContainer } from "@/components/layout/PageContainer";
import type { HardwareRateMap } from "@/utils/hardwareRates";

export default async function RateCardPage() {
    const session = await verifySession();
    if (!session?.userId) return redirect("/login");

    const rateCard = await db.rateCard.findUnique({ where: { userId: session.userId as string } });
    // Global/admin-managed, so no user filter. Inactive items are included so a
    // retired item the user still has a rate for stays visible on this page.
    const hardwareCatalog = await db.hardwareItem.findMany({ orderBy: { sortOrder: "asc" } });

    const initial = {
        profileRateBasis: (rateCard?.profileRateBasis as "weight" | "length") ?? "weight",
        profileRatePerFt: rateCard?.profileRatePerFt ?? 0,
        profileRates: (rateCard?.profileRates as Record<string, number>) ?? {},
        profileWeightPerFt: (rateCard?.profileWeightPerFt as Record<string, number>) ?? {},
        profileRatesPerKg: (rateCard?.profileRatesPerKg as Record<string, number>) ?? {},
        profileGroupCategories: rateCard?.profileGroupCategories ?? ["frame", "shutter", "interlock"],
        profileGroupLabel: rateCard?.profileGroupLabel ?? "Material",
        profileGroupRatePerKg: rateCard?.profileGroupRatePerKg ?? 0,
        glassRates: (rateCard?.glassRates as Record<string, number>) ?? {},
        hardwareRates: (rateCard?.hardwareRates as unknown as HardwareRateMap) ?? {},
        rubberRatePerSqft: rateCard?.rubberRatePerSqft ?? 0,
        brushRatePerSqft: rateCard?.brushRatePerSqft ?? 0,
        coatingRatePerKg: rateCard?.coatingRatePerKg ?? 0,
        coatingWastagePercent: rateCard?.coatingWastagePercent ?? 4,
        laborMode: (rateCard?.laborMode as "flat" | "percentOfMaterial" | "perSqft") ?? "flat",
        laborDefault: rateCard?.laborDefault ?? 0,
        laborPercent: rateCard?.laborPercent ?? 0,
        laborRatePerSqft: rateCard?.laborRatePerSqft ?? 0,
        overheadDefault: rateCard?.overheadDefault ?? 0,
        profitMarginDefault: rateCard?.profitMarginDefault ?? 0,
        taxRateDefault: rateCard?.taxRateDefault ?? 0,
        termsText: rateCard?.termsText ?? "",
        hsnCodes: (rateCard?.hsnCodes as Record<string, string>) ?? {},
        displayLengthUnit: (rateCard?.displayLengthUnit as "mm" | "ft" | "inDora") ?? "mm",
    };

    return (
        <PageContainer size="medium" contentClassName="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Rate Card</h1>
                    <p className="text-sm text-text-muted">Set your pricing once — every new quotation pulls from here by default.</p>
                </div>
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>

            <RateCardForm initial={initial} hardwareCatalog={hardwareCatalog} />
        </PageContainer>
    );
}
