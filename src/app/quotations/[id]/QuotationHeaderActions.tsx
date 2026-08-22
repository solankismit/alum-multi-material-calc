"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, Copy, List, Pencil } from "lucide-react";
import { duplicateQuotation } from "../actions";

interface QuotationHeaderActionsProps {
    id: string;
    worksheetId?: string | null;
    locked: boolean;
}

export default function QuotationHeaderActions({ id, worksheetId, locked }: QuotationHeaderActionsProps) {
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
            toast("Quotation duplicated — now editing the copy.");
            router.push(`/quotations/create?editId=${res.id}`);
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
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
            {!locked && (
                <Link href={`/quotations/create?editId=${id}`}>
                    <Button variant="outline">
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
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
                description="This creates a new editable Draft copy — the original stays as-is."
                confirmLabel="Duplicate"
                isLoading={isPending}
                onConfirm={handleDuplicate}
            />
        </div>
    );
}
