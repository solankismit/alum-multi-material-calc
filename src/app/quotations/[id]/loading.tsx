import { Skeleton, LoadingStatus } from "@/components/ui/Skeleton";

/** Mirrors the actual quotation document shape (header row, info grid, line
 * items, right-aligned totals) instead of two generic blocks — the previous
 * version didn't resemble the two-column invoice layout it was standing in
 * for, so the page visibly jumped in shape once the real content arrived. */
export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <LoadingStatus label="Loading quotation" />
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-9 w-24" />
            </div>
            <div className="bg-surface rounded-xl border border-border p-8 md:p-12 space-y-8">
                <div className="flex items-start justify-between">
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-16 w-48" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                </div>
                <div className="flex justify-end">
                    <Skeleton className="h-32 w-72 rounded-lg" />
                </div>
            </div>
        </div>
    );
}
