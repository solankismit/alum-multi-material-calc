import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[97vh] bg-surface">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
                <p className="text-text-muted font-medium tracking-wide">Loading...</p>
            </div>
        </div>
    );
}
