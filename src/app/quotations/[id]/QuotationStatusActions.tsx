"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateQuotationStatus } from "../actions";
import type { QuotationStatus } from "@prisma/client";

const STATUS_STYLES: Record<QuotationStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    SENT: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
};

export default function QuotationStatusActions({ id, status }: { id: string; status: QuotationStatus }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleChange = (next: QuotationStatus) => {
        setError(null);
        startTransition(async () => {
            const res = await updateQuotationStatus(id, next);
            if (!res.success) {
                setError(res.error || "Failed to update status");
                return;
            }
            router.refresh();
        });
    };

    return (
        <div className="flex items-center gap-2 print:hidden">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>{status}</span>
            {status === "DRAFT" && (
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleChange("SENT")}>
                    Mark as Sent
                </Button>
            )}
            {status === "SENT" && (
                <>
                    <Button size="sm" variant="outline" className="border-green-300 text-green-700" disabled={isPending} onClick={() => handleChange("ACCEPTED")}>
                        Mark Accepted
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-700" disabled={isPending} onClick={() => handleChange("REJECTED")}>
                        Mark Rejected
                    </Button>
                </>
            )}
            {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
    );
}
