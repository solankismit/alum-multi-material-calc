"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Printer } from "lucide-react";
import { markQuotationPrinted } from "../actions";

/**
 * Quotation-specific print button — unlike the generic ClientPrintButton
 * (shared with worksheet/orderbook prints, which should stay side-effect
 * free), printing a quotation locks it from further edits. That's
 * irreversible, so it gets the same confirm-before-acting treatment as
 * Duplicate and status changes elsewhere in this feature — otherwise a
 * single click permanently locks the quote before the OS print dialog
 * even confirms anything was printed.
 */
export default function QuotationPrintButton({ id, label = "Print / Save PDF" }: { id: string; label?: string }) {
    const router = useRouter();
    const [isPrinting, setIsPrinting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleConfirmPrint = async () => {
        setIsPrinting(true);
        try {
            await markQuotationPrinted(id);
            router.refresh();
        } finally {
            setIsPrinting(false);
            setConfirmOpen(false);
        }
        // window.print() is synchronous and blocks until the OS print dialog
        // closes — calling it immediately after setConfirmOpen(false) races
        // React's render (and the dialog's own close animation), so the
        // confirm dialog was still on screen when the print snapshot was
        // taken. Deferring past the dialog's close transition lets it
        // actually unmount first.
        setTimeout(() => window.print(), 300);
    };

    return (
        <>
            <Button onClick={() => setConfirmOpen(true)} isLoading={isPrinting}>
                <Printer className="w-4 h-4 mr-2" />
                {label}
            </Button>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Print this quotation?"
                description="Printing locks this quotation from further edits. To make changes afterward, you'll need to duplicate it as a new draft."
                confirmLabel="Print & lock"
                variant="primary"
                isLoading={isPrinting}
                onConfirm={handleConfirmPrint}
            />
        </>
    );
}
