import { Skeleton, LoadingStatus } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <LoadingStatus label="Loading dashboard" />
            <Skeleton className="h-8 w-48" />
            <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        </div>
    );
}
