import * as React from "react";
import { cn, uiStyles, type BadgeVariant } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = "neutral", ...props }, ref) => (
        <span
            ref={ref}
            className={cn(uiStyles.badge.base, uiStyles.badge[variant], className)}
            {...props}
        />
    )
);
Badge.displayName = "Badge";

export { Badge };
