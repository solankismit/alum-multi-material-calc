import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RateCardForm from "./RateCardForm";

export default async function RateCardPage() {
    const session = await verifySession();
    if (!session?.userId) return redirect("/login");

    const rateCard = await db.rateCard.findUnique({ where: { userId: session.userId as string } });

    const initial = {
        profileRatePerFt: rateCard?.profileRatePerFt ?? 0,
        glassRates: (rateCard?.glassRates as Record<string, number>) ?? {},
        hardwareRates: (rateCard?.hardwareRates as Record<string, number>) ?? {},
        laborDefault: rateCard?.laborDefault ?? 0,
        overheadDefault: rateCard?.overheadDefault ?? 0,
        profitMarginDefault: rateCard?.profitMarginDefault ?? 0,
        taxRateDefault: rateCard?.taxRateDefault ?? 0,
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Rate Card</h1>
                        <p className="text-sm text-slate-500">Set your pricing once — every new quotation pulls from here by default.</p>
                    </div>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                </div>

                <RateCardForm initial={initial} />
            </div>
        </div>
    );
}
