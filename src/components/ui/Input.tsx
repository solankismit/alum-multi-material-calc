import { cn } from "@/lib/utils";
import * as React from "react";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    labelClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", type, label, error, id, labelClassName, ...props }, ref) => {
        const inputId = id || props.name;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className={`block text-sm font-medium leading-6 text-text mb-1 ${labelClassName}`}
                    >
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    id={inputId}
                    name={inputId}
                    className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm ring-offset-surface placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
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
Input.displayName = "Input";

export { Input };
