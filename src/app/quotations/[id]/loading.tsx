import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-8">
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
        </div>
    );
}
