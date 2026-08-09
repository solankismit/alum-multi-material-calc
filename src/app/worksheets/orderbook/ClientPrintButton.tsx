"use client";

import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";

export default function ClientPrintButton({ label = "Print" }: { label?: string }) {
    return (
        <Button onClick={() => window.print()} variant="outline" className="border-slate-300">
            <Printer className="w-4 h-4 mr-2" />
            {label}
        </Button>
    );
}
