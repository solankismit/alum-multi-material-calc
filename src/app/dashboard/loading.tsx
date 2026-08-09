import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-8">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        </div>
    );
}
