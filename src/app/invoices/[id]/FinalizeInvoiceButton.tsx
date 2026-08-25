"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { FileCheck } from "lucide-react";
import { finalizeInvoice, previewNextInvoiceNumber } from "../actions";

/**
 * The one irreversible step in an invoice's life: assigns the GST serial
 * and freezes the seller snapshot. Separated from Preview/Print so a user
 * can look at an unnumbered draft as many times as they like before
 * committing — see the plan's "Preview vs. Issue" journey fix.
 */
export default function FinalizeInvoiceButton({ id, invoicePrefix }: { id: string; invoicePrefix: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [previewNumber, setPreviewNumber] = useState<string | null>(null);

    useEffect(() => {
        if (!confirmOpen) return;
        previewNextInvoiceNumber(invoicePrefix).then((res) => {
            if (res.success) setPreviewNumber(res.invoiceNumber);
        });
    }, [confirmOpen, invoicePrefix]);

    const handleConfirm = async () => {
        setIsFinalizing(true);
        try {
            const res = await finalizeInvoice(id);
            if (!res.success) {
                toast(res.error || "Failed to issue invoice", "error");
                return;
            }
            toast(`Invoice ${res.invoiceNumber} issued.`);
            setConfirmOpen(false);
            router.refresh();
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <>
            <Button onClick={() => setConfirmOpen(true)}>
                <FileCheck className="w-4 h-4 mr-2" />
                Issue Invoice
            </Button>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={previewNumber ? `Issuing ${previewNumber}` : "Issue this invoice?"}
                description="This assigns a permanent invoice number and cannot be undone. Depending on your settings, the invoice may also lock from further edits once issued."
                confirmLabel="Issue Invoice"
                variant="primary"
                isLoading={isFinalizing}
                onConfirm={handleConfirm}
            />
        </>
    );
}
