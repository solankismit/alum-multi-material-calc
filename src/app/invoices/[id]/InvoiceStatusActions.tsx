"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { updateInvoiceStatus } from "../actions";
import type { InvoiceStatus } from "@prisma/client";
import { INVOICE_STATUS_VARIANT } from "@/lib/utils";

export default function InvoiceStatusActions({ id, status }: { id: string; status: InvoiceStatus }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [pending, setPending] = useState<Extract<InvoiceStatus, "PAID" | "CANCELLED"> | null>(null);

    const handleConfirm = () => {
        if (!pending) return;
        const next = pending;
        startTransition(async () => {
            const res = await updateInvoiceStatus(id, next);
            if (!res.success) {
                toast(res.error || "Failed to update status", "error");
            } else {
                toast(`Invoice marked as ${next.toLowerCase()}.`);
                router.refresh();
            }
            setPending(null);
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Badge variant={INVOICE_STATUS_VARIANT[status]}>{status}</Badge>
            {status === "ISSUED" && (
                <>
                    <Button size="sm" variant="outline" className="border-success-border text-success" disabled={isPending} onClick={() => setPending("PAID")}>
                        Mark Paid
                    </Button>
                    <Button size="sm" variant="outline" className="border-danger-border text-danger" disabled={isPending} onClick={() => setPending("CANCELLED")}>
                        Cancel Invoice
                    </Button>
                </>
            )}
            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => !open && setPending(null)}
                title={pending === "CANCELLED" ? "Cancel this invoice?" : "Mark invoice as paid?"}
                variant={pending === "CANCELLED" ? "danger" : "primary"}
                isLoading={isPending}
                onConfirm={handleConfirm}
            />
        </div>
    );
}
