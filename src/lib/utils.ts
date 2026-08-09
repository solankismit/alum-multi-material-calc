import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const uiStyles = {
    card: "bg-surface border border-border rounded-xl shadow-sm",
    cardHover: "transition-all hover:shadow-md hover:border-border-strong",
    sectionCard: "relative p-3 sm:p-6 bg-surface border border-border rounded-xl shadow-sm transition-all hover:shadow-md hover:border-border-strong",
    darkPanel: "bg-surface-inverse rounded-xl shadow-lg p-4 text-text-inverse",
    selectableButton: {
        base: "border-2 transition-all duration-200",
        active: "border-primary bg-primary/5 text-primary shadow-sm",
        inactive: "border-border text-text-muted hover:border-border-strong hover:bg-surface-muted",
    },
    badge: {
        base: "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        neutral: "bg-surface-muted text-text-muted border border-border",
        primary: "bg-primary/10 text-primary border border-primary/20",
        success: "bg-success-surface text-success border border-success-border",
        warning: "bg-warning-surface text-warning border border-warning-border",
        danger: "bg-danger-surface text-danger border border-danger-border",
    },
    container: {
        narrow: "max-w-2xl",
        medium: "max-w-4xl",
        wide: "max-w-7xl",
    },
} as const

export type BadgeVariant = Exclude<keyof typeof uiStyles.badge, "base">

/** Shared status→badge-variant mapping so Quotation status colors aren't
 * defined independently in multiple places (quotations list + detail). */
export const QUOTATION_STATUS_VARIANT: Record<string, BadgeVariant> = {
    DRAFT: "neutral",
    SENT: "primary",
    ACCEPTED: "success",
    REJECTED: "danger",
}
