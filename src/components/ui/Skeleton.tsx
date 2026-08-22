import { cn } from "@/lib/utils";

/** Purely decorative shimmer block — carries no information on its own, so it's
 * hidden from assistive tech. Pair it with a `<LoadingStatus />` once per
 * loading screen so screen reader users get a single "Loading…" announcement
 * instead of silence (or, if every Skeleton announced itself, a chorus of them). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            aria-hidden="true"
            className={cn("animate-pulse rounded-md bg-border", className)}
            {...props}
        />
    );
}

/** Visually-hidden live region announcing a loading state once per screen. */
export function LoadingStatus({ label = "Loading" }: { label?: string }) {
    return (
        <span role="status" aria-live="polite" className="sr-only">
            {label}…
        </span>
    );
}
