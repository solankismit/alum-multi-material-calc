import { Skeleton, LoadingStatus } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <LoadingStatus label="Loading quotations" />
            <Skeleton className="h-8 w-40" />
            <div className="rounded-xl border border-border overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-none border-b border-border last:border-0" />
                ))}
            </div>
        </div>
    );
}
