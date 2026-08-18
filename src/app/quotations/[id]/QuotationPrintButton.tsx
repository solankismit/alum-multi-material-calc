"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";
import { markQuotationPrinted } from "../actions";

/**
 * Quotation-specific print button — unlike the generic ClientPrintButton
 * (shared with worksheet/orderbook prints, which should stay side-effect
 * free), printing a quotation locks it from further edits.
 */
export default function QuotationPrintButton({ id, label = "Print / Save PDF" }: { id: string; label?: string }) {
    const router = useRouter();
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            await markQuotationPrinted(id);
            router.refresh();
        } finally {
            setIsPrinting(false);
        }
        window.print();
    };

    return (
        <Button onClick={handlePrint} variant="outline" className="border-slate-300" isLoading={isPrinting}>
            <Printer className="w-4 h-4 mr-2" />
            {label}
        </Button>
    );
}
