import { cn } from "@/lib/utils";
import * as React from "react";

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    labelClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = "", label, error, id, labelClassName, ...props }, ref) => {
        const textareaId = id || props.name;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className={`block text-sm font-medium leading-6 text-text mb-1 ${labelClassName}`}
                    >
                        {label}
                    </label>
                )}
                <textarea
                    id={textareaId}
                    name={textareaId}
                    className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm ring-offset-surface placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <p className="mt-1 text-sm text-danger">{error}</p>}
            </div>
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea };
