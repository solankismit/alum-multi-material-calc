import { cn, uiStyles } from "@/lib/utils";

export interface PageContainerProps {
    size?: "narrow" | "medium" | "wide";
    className?: string;
    contentClassName?: string;
    children: React.ReactNode;
}

/**
 * Shared page shell. Standardizes the outer background/padding wrapper and
 * the content max-width so pages stop inventing their own container
 * conventions (the app previously had 6+ different max-widths).
 */
export function PageContainer({
    size = "wide",
    className,
    contentClassName,
    children,
}: PageContainerProps) {
    return (
        <div className={cn("min-h-screen bg-surface-muted", className)}>
            <div
                className={cn(
                    "mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8",
                    uiStyles.container[size],
                    contentClassName
                )}
            >
                {children}
            </div>
        </div>
    );
}
