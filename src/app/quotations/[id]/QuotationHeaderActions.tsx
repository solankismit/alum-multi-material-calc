"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Copy, List } from "lucide-react";
import { duplicateQuotation } from "../actions";

interface QuotationHeaderActionsProps {
    id: string;
    worksheetId?: string | null;
}

export default function QuotationHeaderActions({ id, worksheetId }: QuotationHeaderActionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleDuplicate = () => {
        setError(null);
        startTransition(async () => {
            const res = await duplicateQuotation(id);
            if (!res.success || !res.id) {
                setError(res.error || "Failed to duplicate");
                return;
            }
            router.push(`/quotations/${res.id}`);
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Link href="/dashboard">
                <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
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
            <Button variant="outline" disabled={isPending} onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
            </Button>
            {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
    );
}
