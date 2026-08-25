"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { uiStyles, INVOICE_STATUS_VARIANT, type BadgeVariant, cn } from "@/lib/utils";
import { updateInvoiceStatus } from "./actions";

const NEXT_STATUSES: Record<InvoiceStatus, Extract<InvoiceStatus, "PAID" | "CANCELLED">[]> = {
    DRAFT: [],
    ISSUED: ["PAID", "CANCELLED"],
    PAID: [],
    CANCELLED: [],
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
    DRAFT: "Draft",
    ISSUED: "Issued",
    PAID: "Paid",
    CANCELLED: "Cancelled",
};

const CHEVRON_BG =
    "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%25011.06.02L10%2011.168l3.71-3.938a.75.75%200%25011.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]";

const badgeClass = (variant: BadgeVariant, interactive: boolean) =>
    cn(
        uiStyles.badge.base,
        uiStyles.badge[variant],
        "flex-shrink-0 whitespace-nowrap opacity-100",
        interactive && "cursor-pointer appearance-none pr-5 bg-no-repeat bg-[right_0.4rem_center] bg-[length:0.65rem]",
        interactive && CHEVRON_BG
    );

/** Same interactive-badge pattern as QuotationStatusCell — DRAFT/CANCELLED
 * render as a plain (non-interactive) badge since there's no valid next
 * status for them from this control (DRAFT transitions via Finalize, not a
 * status dropdown; CANCELLED and PAID are terminal). */
export default function InvoiceStatusCell({ id, status }: { id: string; status: InvoiceStatus }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [pendingNext, setPendingNext] = useState<Extract<InvoiceStatus, "PAID" | "CANCELLED"> | null>(null);

    const nextOptions = NEXT_STATUSES[status] ?? [];

    const handleConfirm = () => {
        if (!pendingNext) return;
        const next = pendingNext;
        startTransition(async () => {
            const res = await updateInvoiceStatus(id, next);
            if (!res.success) {
                toast(res.error || "Failed to update status", "error");
            } else {
                toast(`Invoice marked as ${next.toLowerCase()}.`);
                router.refresh();
            }
            setPendingNext(null);
        });
    };

    if (nextOptions.length === 0) {
        return <span className={badgeClass(INVOICE_STATUS_VARIANT[status], false)}>{STATUS_LABELS[status]}</span>;
    }

    return (
        <>
            <select
                value={status}
                disabled={isPending}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                    e.stopPropagation();
                    setPendingNext(e.target.value as Extract<InvoiceStatus, "PAID" | "CANCELLED">);
                }}
                className={badgeClass(INVOICE_STATUS_VARIANT[status], true)}
                aria-label={`Invoice status: ${STATUS_LABELS[status]}. Change status`}
            >
                <option value={status}>{STATUS_LABELS[status]}</option>
                {nextOptions.map((s) => (
                    <option key={s} value={s}>
                        Mark as {STATUS_LABELS[s]}
                    </option>
                ))}
            </select>

            <ConfirmDialog
                open={pendingNext !== null}
                onOpenChange={(open) => !open && setPendingNext(null)}
                title={pendingNext ? `Mark invoice as ${STATUS_LABELS[pendingNext].toLowerCase()}?` : ""}
                confirmLabel="Confirm"
                variant={pendingNext === "CANCELLED" ? "danger" : "primary"}
                isLoading={isPending}
                onConfirm={handleConfirm}
            />
        </>
    );
}
