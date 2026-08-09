"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { updateQuotationStatus } from "../actions";
import type { QuotationStatus } from "@prisma/client";
import { QUOTATION_STATUS_VARIANT } from "@/lib/utils";

interface PendingChange {
    next: QuotationStatus;
    title: string;
    description: string;
    variant: "danger" | "primary";
}

export default function QuotationStatusActions({ id, status }: { id: string; status: QuotationStatus }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

    const requestChange = (change: PendingChange) => setPendingChange(change);

    const handleConfirm = () => {
        if (!pendingChange) return;
        const { next } = pendingChange;
        startTransition(async () => {
            const res = await updateQuotationStatus(id, next);
            if (!res.success) {
                toast(res.error || "Failed to update status", "error");
            } else {
                toast(`Quotation marked as ${next.toLowerCase()}.`);
                router.refresh();
            }
            setPendingChange(null);
        });
    };

    return (
        <div className="flex items-center gap-2 print:hidden">
            <Badge variant={QUOTATION_STATUS_VARIANT[status]}>{status}</Badge>
            {status === "DRAFT" && (
                <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                        requestChange({
                            next: "SENT",
                            title: "Mark quotation as sent?",
                            description: "This marks the quotation as sent to the client.",
                            variant: "primary",
                        })
                    }
                >
                    Mark as Sent
                </Button>
            )}
            {status === "SENT" && (
                <>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-success-border text-success"
                        disabled={isPending}
                        onClick={() =>
                            requestChange({
                                next: "ACCEPTED",
                                title: "Mark quotation as accepted?",
                                description: "This marks the quotation as accepted by the client.",
                                variant: "primary",
                            })
                        }
                    >
                        Mark Accepted
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-danger-border text-danger"
                        disabled={isPending}
                        onClick={() =>
                            requestChange({
                                next: "REJECTED",
                                title: "Mark quotation as rejected?",
                                description: "This marks the quotation as rejected by the client.",
                                variant: "danger",
                            })
                        }
                    >
                        Mark Rejected
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() =>
                            requestChange({
                                next: "DRAFT",
                                title: "Revise back to Draft?",
                                description: "The quotation will move back to Draft status and can be edited again.",
                                variant: "primary",
                            })
                        }
                    >
                        Revise (back to Draft)
                    </Button>
                </>
            )}
            {(status === "ACCEPTED" || status === "REJECTED") && (
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                        requestChange({
                            next: "DRAFT",
                            title: "Revise back to Draft?",
                            description: "This reverts the quotation's finalized status back to Draft.",
                            variant: "danger",
                        })
                    }
                >
                    Revise (back to Draft)
                </Button>
            )}

            <ConfirmDialog
                open={pendingChange !== null}
                onOpenChange={(open) => !open && setPendingChange(null)}
                title={pendingChange?.title ?? ""}
                description={pendingChange?.description}
                confirmLabel="Confirm"
                variant={pendingChange?.variant ?? "primary"}
                isLoading={isPending}
                onConfirm={handleConfirm}
            />
        </div>
    );
}
