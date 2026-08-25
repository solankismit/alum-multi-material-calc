"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Pencil } from "lucide-react";

export default function InvoiceHeaderActions({ id, editable }: { id: string; editable: boolean }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Link href="/invoices">
                <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Invoices
                </Button>
            </Link>
            {editable && (
                <Link href={`/invoices/create?editId=${id}`}>
                    <Button variant="outline">
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                </Link>
            )}
        </div>
    );
}
