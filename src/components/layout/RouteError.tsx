"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function RouteError({
    error,
    reset,
    backHref = "/dashboard",
    backLabel = "Back to Dashboard",
}: {
    error: Error & { digest?: string };
    reset: () => void;
    backHref?: string;
    backLabel?: string;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-danger" />
            <div>
                <h2 className="text-lg font-semibold text-text">Something went wrong</h2>
                <p className="mt-1 text-sm text-text-muted">We hit an unexpected error loading this page.</p>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" onClick={reset}>
                    Try again
                </Button>
                <Link href={backHref} className="text-primary hover:underline text-sm font-medium">
                    {backLabel}
                </Link>
            </div>
        </div>
    );
}
