"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuotationStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { uiStyles, QUOTATION_STATUS_VARIANT, type BadgeVariant, cn } from "@/lib/utils";
import { updateQuotationStatus } from "./actions";

/** Valid next states for each current status — same rules as the detail
 * page's QuotationStatusActions, just presented as a dropdown instead of a
 * row of buttons (there isn't room for that in a list row). */
const NEXT_STATUSES: Record<QuotationStatus, QuotationStatus[]> = {
    DRAFT: ["SENT"],
    SENT: ["ACCEPTED", "REJECTED", "DRAFT"],
    ACCEPTED: ["DRAFT"],
    REJECTED: ["DRAFT"],
};

const STATUS_LABELS: Record<QuotationStatus, string> = {
    DRAFT: "Draft",
    SENT: "Sent",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
};

// `appearance-none` strips the native OS dropdown arrow so the element can
// look like a badge instead of a form control — this SVG chevron replaces
// it. Without an explicit background-image here, the badge previously had
// dead space reserved (via pr-5) for an arrow that never rendered.
const CHEVRON_BG =
    "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%25011.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]";

const badgeClass = (variant: BadgeVariant) =>
    cn(
        uiStyles.badge.base,
        uiStyles.badge[variant],
        "flex-shrink-0 whitespace-nowrap cursor-pointer appearance-none pr-5 bg-no-repeat bg-[right_0.4rem_center] bg-[length:0.65rem] opacity-100",
        CHEVRON_BG
    );

/**
 * The quotations list previously showed status as a plain read-only Badge —
 * changing status meant opening the quotation, finding the status actions in
 * its header, and coming back. This makes the badge itself the control: a
 * native <select> (real dropdown semantics, no extra JS positioning needed)
 * styled to look like the existing badge, gated by the same confirm-before-
 * change step the detail page uses for the same transitions.
 */
export default function QuotationStatusCell({ id, status }: { id: string; status: QuotationStatus }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [pendingNext, setPendingNext] = useState<QuotationStatus | null>(null);

    const handleConfirm = () => {
        if (!pendingNext) return;
        const next = pendingNext;
        startTransition(async () => {
            const res = await updateQuotationStatus(id, next);
            if (!res.success) {
                toast(res.error || "Failed to update status", "error");
            } else {
                toast(`Quotation marked as ${next.toLowerCase()}.`);
                router.refresh();
            }
            setPendingNext(null);
        });
    };

    const nextOptions = NEXT_STATUSES[status] ?? [];

    return (
        <>
            <select
                value={status}
                disabled={isPending}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                    e.stopPropagation();
                    setPendingNext(e.target.value as QuotationStatus);
                }}
                className={badgeClass(QUOTATION_STATUS_VARIANT[status])}
                aria-label={`Quotation status: ${STATUS_LABELS[status]}. Change status`}
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
                title={pendingNext ? `Mark quotation as ${STATUS_LABELS[pendingNext].toLowerCase()}?` : ""}
                description={
                    pendingNext === "DRAFT"
                        ? "The quotation moves back to Draft and can be edited again."
                        : pendingNext
                            ? `This marks the quotation as ${STATUS_LABELS[pendingNext].toLowerCase()}.`
                            : undefined
                }
                confirmLabel="Confirm"
                variant={pendingNext === "REJECTED" ? "danger" : "primary"}
                isLoading={isPending}
                onConfirm={handleConfirm}
            />
        </>
    );
}
