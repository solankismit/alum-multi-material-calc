import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RateCardForm from "./RateCardForm";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function RateCardPage() {
    const session = await verifySession();
    if (!session?.userId) return redirect("/login");

    const rateCard = await db.rateCard.findUnique({ where: { userId: session.userId as string } });

    const initial = {
        profileRatePerFt: rateCard?.profileRatePerFt ?? 0,
        profileRates: (rateCard?.profileRates as Record<string, number>) ?? {},
        glassRates: (rateCard?.glassRates as Record<string, number>) ?? {},
        hardwareRates: (rateCard?.hardwareRates as Record<string, number>) ?? {},
        laborMode: (rateCard?.laborMode as "flat" | "percentOfMaterial" | "perSqft") ?? "flat",
        laborDefault: rateCard?.laborDefault ?? 0,
        laborPercent: rateCard?.laborPercent ?? 0,
        laborRatePerSqft: rateCard?.laborRatePerSqft ?? 0,
        overheadDefault: rateCard?.overheadDefault ?? 0,
        profitMarginDefault: rateCard?.profitMarginDefault ?? 0,
        taxRateDefault: rateCard?.taxRateDefault ?? 0,
        termsText: rateCard?.termsText ?? "",
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

            <RateCardForm initial={initial} />
        </PageContainer>
    );
}
