import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function AccessDenied({
    message = "You do not have permission to view this.",
    backHref = "/dashboard",
    backLabel = "Back to Dashboard",
}: {
    message?: string;
    backHref?: string;
    backLabel?: string;
}) {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-danger" />
            <p className="text-text-muted">{message}</p>
            <Link href={backHref} className="text-primary hover:underline text-sm font-medium">
                &larr; {backLabel}
            </Link>
        </div>
    );
}
