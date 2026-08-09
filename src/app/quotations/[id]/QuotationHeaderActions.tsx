"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, Copy, List } from "lucide-react";
import { duplicateQuotation } from "../actions";

interface QuotationHeaderActionsProps {
    id: string;
    worksheetId?: string | null;
}

export default function QuotationHeaderActions({ id, worksheetId }: QuotationHeaderActionsProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleDuplicate = () => {
        startTransition(async () => {
            const res = await duplicateQuotation(id);
            setConfirmOpen(false);
            if (!res.success || !res.id) {
                toast(res.error || "Failed to duplicate quotation", "error");
                return;
            }
            toast("Quotation duplicated.");
            router.push(`/quotations/${res.id}`);
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Link href="/quotations">
                <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Quotations
                </Button>
            </Link>
            {worksheetId && (
                <Link href={`/worksheets/${worksheetId}/windows-list`}>
                    <Button variant="outline">
                        <List className="w-4 h-4 mr-2" />
                        Windows List
                    </Button>
                </Link>
            )}
            <Button variant="outline" disabled={isPending} onClick={() => setConfirmOpen(true)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
            </Button>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Duplicate this quotation?"
                description="This creates a new Draft quotation with the same details."
                confirmLabel="Duplicate"
                isLoading={isPending}
                onConfirm={handleDuplicate}
            />
        </div>
    );
}
