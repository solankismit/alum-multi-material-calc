"use client";

import { RouteError } from "@/components/layout/RouteError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <RouteError error={error} reset={reset} backHref="/" backLabel="Back to Calculator" />;
}
