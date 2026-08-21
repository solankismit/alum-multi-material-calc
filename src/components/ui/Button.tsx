import * as React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50";

        const variants = {
            primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
            secondary: "bg-surface text-text shadow-sm ring-1 ring-inset ring-border hover:bg-surface-muted",
            outline: "border border-border bg-transparent hover:bg-surface-muted text-text",
            ghost: "hover:bg-surface-muted hover:text-text text-text-muted",
            danger: "bg-danger text-white hover:bg-danger/90 shadow-sm",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-10 px-4 py-2 text-sm",
            lg: "h-12 px-8 text-base",
            icon: "h-10 w-10",
        };

        const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

        return (
            <button
                ref={ref}
                className={combinedClassName}
                disabled={isLoading || disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
