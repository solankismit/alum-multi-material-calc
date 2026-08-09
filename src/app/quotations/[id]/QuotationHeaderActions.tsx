"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export default function QuotationHeaderActions() {
    return (
        <Link href="/dashboard">
            <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Button>
        </Link>
    );
}
