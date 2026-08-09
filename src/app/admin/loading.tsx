import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
            <Skeleton className="h-8 w-56" />
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}
