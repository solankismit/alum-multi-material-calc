import { Skeleton, LoadingStatus } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <LoadingStatus label="Loading worksheet" />
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    );
}
